import { Webhook } from 'svix'
import { prisma } from '../config/db.js'
import crypto from 'crypto';
import "dotenv/config"
import { sendNotification } from '../utils/notificationHelper.js';


export const handleClerkWebhook = async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return res.status(500).json({ success:false, message: "Missing Webhook Secret" });
  }

  // Get the headers and body
  const headers = req.headers;
  const payload = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body)

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  // Verify the webhook signature
  try {
    evt = wh.verify(payload, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"],
    });
  } catch (err) {
    return res.status(400).json({ success:false, message: "Webhook verification failed" });
  }

  // Handle the "user.created" event
  const { id, email_addresses, first_name, last_name } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {

    const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : null;

    if (!email) {
      console.error("❌ No email found in the webhook data");
      return res.status(400).json({ success:false, message: "No email provided" });
    }
    await prisma.user.upsert({
     where: { id: id }, // Look for user by Clerk ID
        update: {
          email: email,
          name: `${first_name || ""} ${last_name || ""}`.trim(),
        },
        create: {
          id: id,
          email: email,
          name: `${first_name || ""} ${last_name || ""}`.trim(),
          role: "CUSTOMER", // Default role for new signups
        },
    });
    console.log(`👤 User ${id} synced to database.`);
  }

  return res.status(200).json({ success: true });
};

export const handleSquadWebhook = async (req, res) => {
  try {
    const squadSignature = req.headers['x-squad-signature'];
    const secretKey = process.env.SQUAD_SECRET_KEY;

    if (!squadSignature || !secretKey) {
      return res.status(401).send('Unauthorized: Missing signature or key');
    }

    // 🛡️ Verify HMAC SHA512 Signature using raw request body
    const payload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    const computedBuffer = Buffer.from(computedHash, 'utf8');
    const signatureBuffer = Buffer.from(squadSignature, 'utf8');

    if (
      computedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(computedBuffer, signatureBuffer)
    ) {
      console.error('❌ Invalid Squad Webhook Signature!');
      return res.status(401).send('Unauthorized: Signature mismatch');
    }

    const { Event, TransactionRef, Body } = req.body;
    const reference = TransactionRef || Body?.transaction_ref;

    if (!reference) {
      return res.status(200).send('Ignored: No reference present');
    }

    // ==========================================
    // 💳 1. CUSTOMER PAYMENT SUCCESS
    // ==========================================
    if (Event === 'charge_successful' || Body?.transaction_status === 'Success') {
      const result = await prisma.$transaction(
        async (tx) => {
          // Idempotency Check: find unpaid orders tied to this transaction reference
          const unpaidOrders = await tx.order.findMany({
            where: {
              transactionId: reference,
              paymentStatus: { not: 'PAID' },
            },
          });

          if (unpaidOrders.length === 0) {
            return { alreadyProcessed: true };
          }

          const customerId = unpaidOrders[0].customerId;
          const couponId = unpaidOrders.find((o) => o.couponId)?.couponId || Body?.meta?.couponId;

          // Mark order as PAID & PAYMENT_CONFIRMED
          await tx.order.updateMany({
            where: {
              transactionId: reference,
              paymentStatus: { not: 'PAID' },
            },
            data: {
              paymentStatus: 'PAID',
              status: 'PAYMENT_CONFIRMED',
            },
          });

          // 🔑 Safely record coupon usage across all vendor orders that received a discount share
          if (couponId) {
            let globalUsageIncremented = false;

            for (const order of unpaidOrders) {
              if (Number(order.totalDiscountAmount) > 0) {
                const existingUsage = await tx.couponUsage.findFirst({
                  where: { orderId: order.id },
                });

                if (!existingUsage) {
                  // 1. Create a usage record for this specific vendor order
                  await tx.couponUsage.create({
                    data: {
                      couponId,
                      userId: customerId,
                      orderId: order.id,
                      discountAmount: order.totalDiscountAmount,
                    },
                  });

                  // 2. Increment global coupon usage count ONLY ONCE for the entire batch
                  if (!globalUsageIncremented) {
                    await tx.coupon.update({
                      where: { id: couponId },
                      data: {
                        usageCount: { increment: 1 },
                      },
                    });
                    globalUsageIncremented = true;
                  }
                }
              }
            }
          }

          // Create Order Status History Audit Trail
          const historyData = unpaidOrders.map((order) => ({
            orderId: order.id,
            status: 'PAYMENT_CONFIRMED',
          }));
          await tx.orderStatusHistory.createMany({ data: historyData });

          // Automatic Cart Cleanup for Customer
          await tx.cartItem.deleteMany({
            where: { userId: customerId },
          });

          return {
            alreadyProcessed: false,
            customerId,
            orderCount: unpaidOrders.length,
          };
        },
        { maxWait: 10000, timeout: 15000 }
      );

      if (result.alreadyProcessed) {
        console.log(`ℹ️ Duplicate payment webhook skipped for ref: ${reference}`);
        return res.status(200).send('Webhook Received (Duplicate)');
      }

      console.log(`✅ Payment confirmed for ${reference}. Updated ${result.orderCount} orders.`);

      try {
        await sendNotification({
          userId: result.customerId,
          title: 'Payment Confirmed! 🎉',
          body: 'Your payment was successfully received. We are now preparing your order!',
          type: 'ORDER_PAYMENT_SUCCESS',
          appType: 'CUSTOMER',
          data: { paymentReference: reference },
        });
      } catch (notifErr) {
        console.error('⚠️ Notification delivery failed:', notifErr.message);
      }
    }

    // ==========================================
    // 💸 2. SUCCESSFUL DISBURSEMENT / TRANSFER
    // ==========================================
    else if (Event === 'transfer_successful') {
      const isVendor = reference.startsWith('VEND-');
      const isChampion = reference.startsWith('CHAMP-');

      if (!isVendor && !isChampion) {
        return res.status(200).send('Ignored: Unknown reference prefix');
      }

      const result = await prisma.$transaction(async (tx) => {
        if (isVendor) {
          const txRecord = await tx.vendorTransaction.findUnique({
            where: { reference },
            include: { wallet: { include: { vendor: true } } },
          });
          if (!txRecord || txRecord.status !== 'PENDING') return { skip: true };

          await tx.vendorTransaction.update({
            where: { id: txRecord.id },
            data: { status: 'SUCCESS' },
          });

          return {
            userId: txRecord.wallet.vendor.userId,
            amount: txRecord.amount,
            role: 'VENDOR',
          };
        } else {
          const txRecord = await tx.championTransaction.findUnique({
            where: { reference },
            include: { wallet: { include: { champion: true } } },
          });
          if (!txRecord || txRecord.status !== 'PENDING') return { skip: true };

          await tx.championTransaction.update({
            where: { id: txRecord.id },
            data: { status: 'SUCCESS' },
          });

          return {
            userId: txRecord.wallet.champion.userId,
            amount: txRecord.amount,
            role: 'CHAMPION',
          };
        }
      });

      if (!result.skip) {
        await sendNotification({
          userId: result.userId,
          title: 'Withdrawal Successful! 💸',
          body: `Your withdrawal of ₦${Number(result.amount).toLocaleString()} has been deposited.`,
          type: 'WITHDRAWAL_SUCCESS',
          appType: result.role,
          data: { reference },
        }).catch((err) => console.error('Notification error:', err.message));
      }
    }

    // ==========================================
    // 🔴 3. FAILED / REVERSED DISBURSEMENT
    // ==========================================
    else if (Event === 'transfer_failed' || Event === 'transfer_reversed') {
      const isVendor = reference.startsWith('VEND-');
      const isChampion = reference.startsWith('CHAMP-');

      if (!isVendor && !isChampion) {
        return res.status(200).send('Ignored: Unknown reference prefix');
      }

      const result = await prisma.$transaction(async (tx) => {
        if (isVendor) {
          const txRecord = await tx.vendorTransaction.findUnique({
            where: { reference },
            include: { wallet: { include: { vendor: true } } },
          });
          if (!txRecord || txRecord.status !== 'PENDING') return { skip: true };

          // Mark transaction failed
          await tx.vendorTransaction.update({
            where: { id: txRecord.id },
            data: { status: 'FAILED' },
          });

          // Re-credit wallet
          await tx.vendorWallet.update({
            where: { id: txRecord.walletId },
            data: { availableBalance: { increment: txRecord.amount } },
          });

          // Log refund
          await tx.vendorTransaction.create({
            data: {
              walletId: txRecord.walletId,
              amount: txRecord.amount,
              type: 'WITHDRAWAL_REFUND',
              status: 'SUCCESS',
              reference: `REF-${reference}`,
              description: `Refund for failed withdrawal (${reference})`,
            },
          });

          return {
            userId: txRecord.wallet.vendor.userId,
            amount: txRecord.amount,
            role: 'VENDOR',
          };
        } else {
          const txRecord = await tx.championTransaction.findUnique({
            where: { reference },
            include: { wallet: { include: { champion: true } } },
          });
          if (!txRecord || txRecord.status !== 'PENDING') return { skip: true };

          await tx.championTransaction.update({
            where: { id: txRecord.id },
            data: { status: 'FAILED' },
          });

          await tx.championWallet.update({
            where: { id: txRecord.walletId },
            data: { availableBalance: { increment: txRecord.amount } },
          });

          await tx.championTransaction.create({
            data: {
              walletId: txRecord.walletId,
              amount: txRecord.amount,
              type: 'WITHDRAWAL_REFUND',
              status: 'SUCCESS',
              reference: `REF-${reference}`,
              description: `Refund for failed withdrawal (${reference})`,
            },
          });

          return {
            userId: txRecord.wallet.champion.userId,
            amount: txRecord.amount,
            role: 'CHAMPION',
          };
        }
      });

      if (!result.skip) {
        await sendNotification({
          userId: result.userId,
          title: 'Withdrawal Failed ❌',
          body: `Your withdrawal of ₦${Number(result.amount).toLocaleString()} failed. Funds have been returned to your wallet.`,
          type: 'WITHDRAWAL_FAILED',
          appType: result.role,
          data: { reference },
        }).catch((err) => console.error('Notification error:', err.message));
      }
    }

    // Always acknowledge webhooks with 200 HTTP code
    return res.status(200).send('Webhook Received');
  } catch (error) {
    console.error('❌ Squad Webhook Error:', error.message);
    return res.status(200).send('Error Acknowledged');
  }
};