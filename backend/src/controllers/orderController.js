import { prisma } from '../config/db.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getAuth } from '@clerk/express';
import { sendNotification } from '../utils/notificationHelper.js';
import { notifyOrderStatusChange } from '../utils/notifyOrderStatus.js';
import { getIO } from "../config/socket.js";
import { squadClient } from '../config/squad.js';


const DEFAULT_DELIVERY_FEE = Number(process.env.DEFAULT_DELIVERY_FEE || 1000);
const BASE_DELIVERY_FEE = Number(process.env.BASE_DELIVERY_FEE || 300);
const PER_KM_FEE = Number(process.env.PER_KM_FEE || 100);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const numLat1 = Number(lat1), numLon1 = Number(lon1);
  const numLat2 = Number(lat2), numLon2 = Number(lon2);

  if (!numLat1 || !numLon1 || !numLat2 || !numLon2) return null;

  const R = 6371;
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c * 1.3).toFixed(2));
};


const validateAndCalculateCoupon = async ({
  code,
  userId,
  foodSubtotal,
  totalDeliveryFees,
  vendorBreakdown,
}) => {
  if (!code || typeof code !== 'string') {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: null };
  }

  const formattedCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code: formattedCode },
    include: {
      vendor: {
        select: { businessName: true },
      },
    },
  });

  if (!coupon || !coupon.isActive) {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: "Invalid or inactive promo code." };
  }

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: "This coupon is not active yet." };
  }
  if (coupon.endDate && coupon.endDate < now) {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: "This promo code has expired." };
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: "This promo code limit has been reached." };
  }

  if (coupon.minOrderAmount && foodSubtotal < coupon.minOrderAmount) {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: `Minimum order amount of ₦${coupon.minOrderAmount} required.` };
  }

  // 🏪 Check Vendor Count Limits
  const uniqueVendorCount = vendorBreakdown.length;

  if (coupon.minVendorCount !== null && uniqueVendorCount < coupon.minVendorCount) {
    return {
      discountAmount: 0,
      appliedCoupon: null,
      vendorBreakdown,
      error: `This promo requires ordering from at least ${coupon.minVendorCount} vendors simultaneously.`,
    };
  }

  if (coupon.maxVendorCount !== null && uniqueVendorCount > coupon.maxVendorCount) {
    return {
      discountAmount: 0,
      appliedCoupon: null,
      vendorBreakdown,
      error: `This promo is only valid for single-vendor orders.`,
    };
  }

  // Per-user usage check
  const userUsages = await prisma.couponUsage.count({
    where: { couponId: coupon.id, userId },
  });

  if (coupon.userUsageLimit !== null && userUsages >= coupon.userUsageLimit) {
    return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: `You have reached the maximum redemptions (${coupon.userUsageLimit}) for this promo.` };
  }

  if (coupon.vendorId) {
    const isVendorInCart = vendorBreakdown.some((v) => v.vendorId === coupon.vendorId);
    if (!isVendorInCart) {
      return { discountAmount: 0, appliedCoupon: null, vendorBreakdown, error: "This code isn't applicable to items in your cart." };
    }
  }

  // 🎯 Calculate discount targeting FOOD or DELIVERY
  const isDeliveryDiscount =
    coupon.discountTarget === 'DELIVERY' || coupon.discountType === 'FREE_DELIVERY';

  // If vendor-specific food coupon, target ONLY that specific vendor's subtotal
  let targetAmount = foodSubtotal;
  let targetVendorSubtotal = 0;
  if (!isDeliveryDiscount && coupon.vendorId) {
    const targetVendor = vendorBreakdown.find((v) => v.vendorId === coupon.vendorId);
    targetVendorSubtotal = targetVendor ? targetVendor.subtotal : 0;
    targetAmount = targetVendorSubtotal;
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = (targetAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else if (coupon.discountType === 'FIXED_AMOUNT') {
    discountAmount = Math.min(coupon.discountValue, targetAmount);
  } else if (coupon.discountType === 'FREE_DELIVERY') {
    discountAmount = totalDeliveryFees;
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  // 🚚 Distribute discounts into vendorBreakdown appropriately
  let updatedVendorBreakdown = [...vendorBreakdown];

  if (isDeliveryDiscount && totalDeliveryFees > 0) {
    // Proportionally share delivery discount across all vendor delivery fees
    const discountRatio = Math.min(1, discountAmount / totalDeliveryFees);
    updatedVendorBreakdown = vendorBreakdown.map((vendor) => {
      const reducedFee = Math.max(
        0,
        Math.round((vendor.deliveryFee - vendor.deliveryFee * discountRatio) * 100) / 100
      );
      return {
        ...vendor,
        deliveryFee: reducedFee,
        totalAmount: Math.max(0, vendor.subtotal + reducedFee),
      };
    });
  } else if (!isDeliveryDiscount && coupon.vendorId) {
    // Vendor-specific food discount applies ONLY to the targeted vendor
    updatedVendorBreakdown = vendorBreakdown.map((vendor) => {
      if (vendor.vendorId === coupon.vendorId) {
        const vendorFoodDiscount = Math.min(discountAmount, vendor.subtotal);
        const adjustedSubtotal = Math.max(0, vendor.subtotal - vendorFoodDiscount);
        return {
          ...vendor,
          subtotal: adjustedSubtotal,
          totalAmount: Math.max(0, adjustedSubtotal + vendor.deliveryFee),
        };
      }
      return vendor;
    });
  }

  return {
    discountAmount,
    appliedCoupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountTarget: coupon.discountTarget,
      discountValue: coupon.discountValue,
      fundingType: coupon.fundingType, // Includes fundingType for your checkout split
      vendorId: coupon.vendorId,
      vendorName: coupon.vendor?.businessName || null,
    },
    vendorBreakdown: updatedVendorBreakdown,
    error: null,
  };
};

// 📊 Reusable total calculator across multi-vendor cart
const computeCheckoutTotals = (cartItems, deliveryLat, deliveryLng) => {
  let totalFoodPrice = 0;
  let totalDeliveryFees = 0;
  const vendorBreakdown = [];

  // Group items by vendor
  const itemsByVendor = cartItems.reduce((acc, item) => {
    const vId = item.product.vendorId;
    if (!acc[vId]) acc[vId] = { vendor: item.product.vendor, items: [] };
    acc[vId].items.push(item);
    return acc;
  }, {});

  for (const vId in itemsByVendor) {
    const { vendor, items } = itemsByVendor[vId];

    const dist = calculateDistance(vendor.lat, vendor.lng, deliveryLat, deliveryLng);
    const vendorSubtotal = items.reduce(
      (sum, i) => sum + Number(i.product.price) * i.quantity,
      0
    );
    const vendorDeliveryFee =
      dist !== null ? dist * PER_KM_FEE + BASE_DELIVERY_FEE : DEFAULT_DELIVERY_FEE;

    totalFoodPrice += vendorSubtotal;
    totalDeliveryFees += vendorDeliveryFee;

    vendorBreakdown.push({
      vendorId: vId,
      vendorName: vendor.name,
      distance: dist,
      subtotal: vendorSubtotal,
      deliveryFee: vendorDeliveryFee,
      totalAmount: vendorSubtotal + vendorDeliveryFee,
      items,
    });
  }

  return {
    itemsByVendor,
    totalFoodPrice,
    totalDeliveryFees,
    grandTotal: totalFoodPrice + totalDeliveryFees,
    vendorBreakdown,
  };
};

const getCheckoutPreview = async (req, res) => {
  const { userId } = getAuth(req);
  const { deliveryLat, deliveryLng, couponCode } = req.body;

  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { vendor: true } } },
    });

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }

    const { totalFoodPrice, totalDeliveryFees, vendorBreakdown } =
      computeCheckoutTotals(cartItems, deliveryLat, deliveryLng);

    // Validate Coupon if provided
    const {
      discountAmount,
      appliedCoupon,
      vendorBreakdown: updatedBreakdown,
      error: couponError,
    } = await validateAndCalculateCoupon({
      code: couponCode,
      userId,
      foodSubtotal: totalFoodPrice,
      totalDeliveryFees,
      vendorBreakdown,
    });

    if (couponCode && couponError) {
      return res.status(200).json({
        success: true,
        data: {
          totalFoodPrice,
          totalDeliveryFees,
          discountAmount: 0,
          appliedCoupon: null,
          grandTotal: totalFoodPrice + totalDeliveryFees,
          vendorBreakdown,
          error: couponError,
        },
      });
    }

    // Recalculate delivery fee total after coupon discount distribution
    const finalVendorBreakdown = updatedBreakdown || vendorBreakdown;
    const finalDeliveryFees = finalVendorBreakdown.reduce(
      (sum, v) => sum + (v.deliveryFee || 0),
      0
    );

    const grandTotal = Math.max(0, totalFoodPrice + finalDeliveryFees - (appliedCoupon?.discountTarget === 'FOOD' ? discountAmount : 0));

    return res.status(200).json({
      success: true,
      data: {
        totalFoodPrice,
        totalDeliveryFees: finalDeliveryFees,
        discountAmount,
        appliedCoupon,
        grandTotal,
        vendorBreakdown: finalVendorBreakdown,
      },
    });
  } catch (error) {
    console.error("❌ Preview Error:", error);
    return res.status(500).json({ success: false, message: "Failed to estimate checkout fees." });
  }
};


const checkout = async (req, res) => {
  const { userId } = getAuth(req);
  const { deliveryAddress, phone, deliveryLat, deliveryLng, couponCode } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { vendor: true } } },
    });
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }

    const {
      totalFoodPrice,
      totalDeliveryFees,
      grandTotal: rawGrandTotal,
      vendorBreakdown,
    } = computeCheckoutTotals(cartItems, deliveryLat, deliveryLng);

    // Re-validate coupon in checkout
    let discountAmount = 0;
    let appliedCoupon = null;
    let updatedVendorBreakdown = vendorBreakdown;

    if (couponCode) {
      const couponResult = await validateAndCalculateCoupon({
        code: couponCode,
        userId,
        foodSubtotal: totalFoodPrice,
        totalDeliveryFees,
        vendorBreakdown,
      });

      if (couponResult.error) {
        return res.status(400).json({ success: false, message: couponResult.error });
      }

      discountAmount = couponResult.discountAmount;
      appliedCoupon = couponResult.appliedCoupon;
      updatedVendorBreakdown = couponResult.vendorBreakdown || vendorBreakdown;
    }

    // Determine target type for granular database record snapshots
    const isDeliveryDiscount =
      appliedCoupon?.discountTarget === 'DELIVERY' ||
      appliedCoupon?.discountType === 'FREE_DELIVERY';

    // Calculate overall final delivery fee across vendors
    const finalDeliveryFees = updatedVendorBreakdown.reduce(
      (sum, v) => sum + (v.deliveryFee || 0),
      0
    );

    const finalFoodTotal = !isDeliveryDiscount
      ? Math.max(0, totalFoodPrice - discountAmount)
      : totalFoodPrice;

    // Final Grand Total after discount
    const grandTotal = Math.max(0, finalFoodTotal + finalDeliveryFees);

    const internalReference = `TD-${uuidv4()}`;
    const groupOrderId = `GRP-${uuidv4()}`; // Groups multi-vendor orders together

    // Squad Payment Initialization Payload
    const squadPayload = {
      email: user.email || "customer@example.com",
      amount: Math.round(grandTotal * 100), // Converted to Kobo
      currency: "NGN",
      initiate_type: "inline",
      transaction_ref: internalReference,
      callback_url: `${process.env.BACKEND_URL}/api/order/callback`,
      pass_charge: true, // Merchant absorbs gateway fee
      metadata: {
        userId,
        customerName: user.name || "Foodify User",
        couponId: appliedCoupon ? appliedCoupon.id : null,
        discountAmount,
        groupOrderId,
      },
    };

    const squadResponse = await squadClient.post('/transaction/initiate', squadPayload);

    if (!squadResponse.data?.status || !squadResponse.data?.data?.checkout_url) {
      throw new Error("Failed to retrieve checkout URL from Squad.");
    }

    const { checkout_url: checkoutUrl } = squadResponse.data.data;

    // Distribute discount proportionally across vendor orders
    const totalRawAmount = rawGrandTotal || 1;

    const result = await prisma.$transaction(
      async (tx) => {
        // Soft-cancel previous PENDING checkout attempts
        await tx.order.updateMany({
          where: { customerId: userId, paymentStatus: "PENDING" },
          data: {
            paymentStatus: "UNPAID",
            status: "AWAITING_PAYMENT",
          },
        });

        const orderPromises = updatedVendorBreakdown.map((vendorData) => {
          const { vendorId, distance, subtotal, deliveryFee, totalAmount, items } = vendorData;

          // Find original un-discounted data for this vendor
          const originalVendorData = vendorBreakdown.find((v) => v.vendorId === vendorId);
          const originalSubtotal = originalVendorData ? originalVendorData.subtotal : subtotal;
          const originalDeliveryFee = originalVendorData ? originalVendorData.deliveryFee : deliveryFee;

          let orderFoodDiscount = 0;
          let orderDeliveryDiscount = 0;
          let orderDiscountAmount = 0;

          if (isDeliveryDiscount) {
            // 1. Delivery coupons: Share proportionally across delivery fees
            const originalTotalDelivery = vendorBreakdown.reduce((sum, v) => sum + v.deliveryFee, 0);
            const deliveryShare = originalTotalDelivery > 0 ? originalDeliveryFee / originalTotalDelivery : 0;
            orderDeliveryDiscount = Math.round(discountAmount * deliveryShare * 100) / 100;
            orderDiscountAmount = orderDeliveryDiscount;
          } else if (appliedCoupon?.vendorId) {
            // 2. Vendor-specific food coupon: Apply ONLY to the targeted vendor
            if (vendorId === appliedCoupon.vendorId) {
              orderFoodDiscount = Math.max(0, originalSubtotal - subtotal); // subtotal in updatedVendorBreakdown is already adjusted
              orderDiscountAmount = orderFoodDiscount;
            } else {
              orderFoodDiscount = 0;
              orderDiscountAmount = 0;
            }
          } else {
            // 3. Global platform-wide food coupon: Prorate across vendors based on subtotal share
            const totalOriginalFood = vendorBreakdown.reduce((sum, v) => sum + v.subtotal, 0);
            const foodShare = totalOriginalFood > 0 ? originalSubtotal / totalOriginalFood : 0;
            orderFoodDiscount = Math.round(discountAmount * foodShare * 100) / 100;
            orderDiscountAmount = orderFoodDiscount;
          }

          const isCouponForThisVendor = 
            !appliedCoupon || 
            isDeliveryDiscount || 
            !appliedCoupon.vendorId || 
            vendorId === appliedCoupon.vendorId;

          const orderCouponId = isCouponForThisVendor && appliedCoupon ? appliedCoupon.id : null;
          const orderCouponCode = isCouponForThisVendor && appliedCoupon ? appliedCoupon.code : null;

          // Read exact funding source directly from the Coupon database record
          // Fallback to 'FOODIFY' if it's a delivery coupon, otherwise 'VENDOR'
          const couponFunding = orderCouponId && appliedCoupon 
          ? (appliedCoupon.fundingType || (isDeliveryDiscount ? 'FOODIFY' : 'VENDOR')) 
          : null;

          // -----------------------------------------------------------------
          // FINANCIAL SETTLEMENT CALCULATIONS
          // -----------------------------------------------------------------
          const championEarnings = originalDeliveryFee * 0.5;
          let foodifyRevenue = originalDeliveryFee * 0.5;
          let vendorRevenue = originalSubtotal; // Use original subtotal as base before absorption

          if (couponFunding === 'FOODIFY') {
            foodifyRevenue = Math.max(0, foodifyRevenue - orderDiscountAmount);
          } else {
            // Vendor funds the food discount
            vendorRevenue = Math.max(0, vendorRevenue - orderFoodDiscount);
          }

          return tx.order.create({
            data: {
              groupOrderId,
              customerId: userId,
              vendorId,
              deliveryAddress: deliveryAddress || user.homeAddress || user.address || "",
              phone: phone || user.phone || "",
              deliveryLat: deliveryLat ? Number(deliveryLat) : null,
              deliveryLng: deliveryLng ? Number(deliveryLng) : null,
              distance: distance ?? 0,

              originalSubtotal,
              originalDeliveryFee,

              subtotal: originalSubtotal - orderFoodDiscount,
              deliveryFee,

              foodDiscountAmount: orderFoodDiscount,
              deliveryDiscountAmount: orderDeliveryDiscount,
              totalDiscountAmount: orderDiscountAmount,

              totalAmount: Math.max(0, (originalSubtotal - orderFoodDiscount) + deliveryFee),

              couponId: orderCouponId,
              couponCode: orderCouponCode,
              couponFunding,

              vendorRevenue,
              championEarnings,
              foodifyRevenue,

              transactionId: internalReference,
              paymentStatus: 'PENDING',
              status: 'AWAITING_PAYMENT',

              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.product.price,
                })),
              },
            },
          });
        });

        return await Promise.all(orderPromises);
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return res.status(201).json({
      success: true,
      checkoutUrl,
      transactionId: internalReference,
      groupOrderId,
      orders: result,
    });
  } catch (error) {
    console.error("❌ Checkout Error Details:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Checkout failed.",
    });
  }
};

// ==========================================
// 2. RETRY PAYMENT (Paystack)
// ==========================================
const retryPayment = async (req, res) => {
  const { userId } = getAuth(req);
  const { orderId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: userId, paymentStatus: { in: ['UNPAID', 'FAILED'] } },
    });

    if (!order) {
      return res.status(200).json({ success: false, message: 'Eligible order for retry not found.' });
    }

    const newInternalReference = `TD-RETRY-${uuidv4()}`;

    // Squad Payment Initiation Payload
    const squadPayload = {
      email: user?.email || 'customer@example.com',
      amount: Math.round(Number(order.totalAmount) * 100), // Converted to Kobo
      currency: 'NGN',
      initiate_type: 'inline',
      transaction_ref: newInternalReference,
      callback_url: `${process.env.BACKEND_URL}/api/order/callback`,
      pass_charge: true, // Merchant absorbs gateway fee
      metadata: {
        userId,
        orderId,
        couponId: order.couponId || null,
        discountAmount: order.totalDiscountAmount || 0,
      },
    };

    const squadResponse = await squadClient.post('/transaction/initiate', squadPayload);

    if (!squadResponse.data?.status || !squadResponse.data?.data?.checkout_url) {
      throw new Error("Failed to retrieve checkout URL from Squad.");
    }

    const { checkout_url: checkoutUrl } = squadResponse.data.data;

    // Update the order with the new retry transaction reference and reset status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        transactionId: newInternalReference,
        paymentStatus: 'PENDING',
        status: "AWAITING_PAYMENT",
      },
    });

    return res.status(200).json({
      success: true,
      checkoutUrl,
      transactionId: newInternalReference,
    });
  } catch (error) {
    console.error('❌ Retry Payment Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to re-initialize payment.',
    });
  }
};

// ==========================================
// 3. PAYMENT CALLBACK (Redirect from Paystack)
// ==========================================
const handlePaymentCallback = async (req, res) => {
  // Paystack returns reference as `reference` or `trxref`
  const reference = req.query.reference || req.query.trxref;

  const appDeepLink = `foodify://payment-success?paymentReference=${reference}`;

  return res.redirect(302, appDeepLink);
};

// ==========================================
// 4. VERIFY PAYMENT (Paystack)
// ==========================================
const verifyPayment = async (req, res) => {
  const { reference } = req.params;
  const { userId } = getAuth(req);

  try {
    // 1. Direct lookup by internal transactionId
    const orders = await prisma.order.findMany({
      where: {
        transactionId: reference,
        customerId: userId,
      },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order reference not found.",
      });
    }

    // 2. Early return if already paid
    const isAlreadyPaid = orders.every((o) => o.paymentStatus === "PAID");
    if (isAlreadyPaid) {
      return res.status(200).json({
        success: true,
        paid: true,
        status: "PAID",
        message: "Payment already verified.",
      });
    }

    // 3. Query Squad Verify API
    const encodedRef = encodeURIComponent(reference.trim());
    const squadResponse = await squadClient.get(`/transaction/verify/${encodedRef}`);

    const transactionData = squadResponse.data?.data;
    
    // 🔍 DEBUG: Log full response from Squad to inspect keys
    console.log("🔍 Squad Verify Response Data:", JSON.stringify(transactionData, null, 2));

    const squadStatus = transactionData?.transaction_status; // e.g., 'Success', 'failed', 'pending'
    const expectedTotal = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    
    // 🔑 ROBUST AMOUNT EXTRACTION: Check multiple possible property names from Squad
    const rawAmount = 
      transactionData?.amount || 
      transactionData?.transaction_amount || 
      transactionData?.merchant_amount || 
      0;

    // Squad returns amount in Kobo -> Convert to NGN
    const amountPaid = Number(rawAmount) / 100;

    // 4. Handle Pending Statuses
    if (squadStatus === "pending" || squadStatus === "Processing") {
      await sendNotification({
        userId,
        title: "Payment Processing ⏳",
        body: `We're waiting for your bank to confirm the transaction. Your order will update automatically once received!`,
        type: 'ORDER_PAYMENT_PENDING',
        appType: "CUSTOMER",
        data: { paymentReference: reference, orderId: orders[0]?.id },
      });

      return res.status(200).json({
        success: false,
        paid: false,
        message: "Payment pending with Squad",
      });
    }

    // 5. Handle Failed Statuses
    if (!transactionData || (squadStatus !== "Success" && squadStatus !== "success")) {
      const failedStatus = squadStatus || "FAILED";

      await prisma.order.updateMany({
        where: { transactionId: reference, customerId: userId },
        data: {
          paymentStatus: "FAILED",
          status: "AWAITING_PAYMENT",
        },
      });

      await sendNotification({
        userId,
        title: "Payment Unsuccessful ❌",
        body: `Your payment of ₦${amountPaid.toFixed(2)} was not successful. Please try again.`,
        type: "ORDER_PAYMENT_FAILED",
        appType: "CUSTOMER",
        data: { paymentReference: reference, orderId: orders[0]?.id },
      });

      return res.status(200).json({
        success: false,
        paid: false,
        status: failedStatus,
        message: `Payment failed with status: ${failedStatus}`,
      });
    }

    // 6. Fraud Validation: Verify paid amount matches expected total (with a small ₦1 tolerance for floating point rounding)
    if (amountPaid < expectedTotal - 1) {
      console.error(
        `🚨 FRAUD ALERT: User ${userId} paid ₦${amountPaid} for reference ${reference} expecting ₦${expectedTotal}`
      );

      await prisma.order.updateMany({
        where: { transactionId: reference, customerId: userId },
        data: { paymentStatus: "FAILED", status: "AWAITING_PAYMENT" },
      });

      await sendNotification({
        userId,
        title: "Payment Unsuccessful ❌",
        body: `Your payment was underpaid, you paid ₦${amountPaid} for reference ${reference} expecting ₦${expectedTotal}, Please contact support for refund and retry.`,
        type: "ORDER_PAYMENT_FAILED",
        appType: "CUSTOMER",
        data: { paymentReference: reference, orderId: orders[0]?.id },
      });

      return res.status(200).json({
        success: false,
        paid: false,
        message: "Paid amount does not match order total.",
      });
    }

    // 7. Update DB, Record Coupon Usage safely, and Clear Cart inside a Transaction
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { transactionId: reference, customerId: userId },
        data: {
          paymentStatus: "PAID",
          status: "PAYMENT_CONFIRMED",
        },
      });

      // Safely record coupon usage across all vendor orders that received a discount share
      const couponId = orders.find((o) => o.couponId)?.couponId;
      if (couponId) {
        let globalUsageIncremented = false;

        for (const order of orders) {
          if (Number(order.totalDiscountAmount) > 0) {
            // Check if coupon usage already exists for this specific order
            const existingUsage = await tx.couponUsage.findFirst({
              where: { orderId: order.id },
            });

            if (!existingUsage) {
              // 1. Create a usage record for this specific vendor order
              await tx.couponUsage.create({
                data: {
                  couponId,
                  userId,
                  orderId: order.id,
                  discountAmount: order.totalDiscountAmount,
                },
              });

              // 2. Increment global coupon usage count ONLY ONCE for the entire multi-vendor checkout batch
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
      const historyData = orders.map((o) => ({
        orderId: o.id,
        status: 'PAYMENT_CONFIRMED',
      }));
      if (historyData.length > 0) {
        await tx.orderStatusHistory.createMany({ data: historyData });
      }

      // Clear Cart
      await tx.cartItem.deleteMany({
        where: { userId },
      });
    });

    await sendNotification({
      userId,
      title: "Payment Confirmed! 🎉",
      body: 'Your payment was successfully received. We are now preparing your order!',
      type: "ORDER_PAYMENT_SUCCESS",
      appType: "CUSTOMER",
      data: { paymentReference: reference, orderId: orders[0]?.id },
    });

    return res.status(200).json({
      success: true,
      paid: true,
      status: "PAID",
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error("❌ Payment Verification Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      paid: false,
      message: error.response?.data?.message || error.message || "An error occurred while verifying payment.",
    });
  }
};


const getVendorOrderHistory = async (req, res) => {
    const { userId } = getAuth(req);
    const { month, year } = req.query; // e.g., ?month=3&year=2026

    try {
        // 1. Get the Vendor Profile linked to the User
        const vendorProfile = await prisma.vendor.findUnique({
            where: { userId: userId },
            select: { id: true }
        });

        if (!vendorProfile) {
            return res.status(404).json({ success: false, message: "Vendor profile not found." });
        }

        let dateFilter = {};

        // 2. Build the Date Range if month/year are provided
        if (month && year) {
            const m = parseInt(month);
            const y = parseInt(year);
            
            // Start of the month (e.g., March 1st, 00:00:00)
            const startDate = new Date(y, m - 1, 1);
            // End of the month (e.g., March 31st, 23:59:59)
            const endDate = new Date(y, m, 0, 23, 59, 59);

            dateFilter = {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            };
        }

        // 3. Fetch Completed or Cancelled Orders
        const history = await prisma.order.findMany({
    where: {
        vendorId: vendorProfile.id,
        status: { in: ['DELIVERED', 'CANCELLED'] },
        paymentStatus: "PAID",
        ...dateFilter
    },
    include: {
        items: {
            include: {
                product: { select: { name: true, images: true } }
            }
        },
        customer: { select: { name: true } }
    },
    // deliveryAddress and orderNumber are included automatically!
    orderBy: { createdAt: 'desc' }
});

        // 4. Calculate Earnings (Only from DELIVERED orders)
        const monthlyEarnings = history
            .filter(order => order.status === 'DELIVERED')
            .reduce((sum, order) => sum + Number(order.totalAmount), 0);

        res.status(200).json({
            success: true,
            businessId: vendorProfile.id,
            count: history.length,
            totalEarnings: monthlyEarnings,
            orders: history
        });

    } catch (error) {
        console.error("❌ History Fetch Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch filtered history." });
    }
};


const getUserOrderHistory = async (req, res) => {
    // 1. Extract the actual ID from the auth object
    const { userId } = getAuth(req); 
    const { month, year } = req.query;

    let dateFilter = {};

    // 2. Logic for filtering by date
    if (month && year) {
        const m = parseInt(month);
        const y = parseInt(year);
        
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);

        dateFilter = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
    }

    try {
        const orders = await prisma.order.findMany({
            where: { 
                customerId: userId,
                paymentStatus: "PAID", // Students usually only want to see successful orders in history
                ...dateFilter 
            },
            include: {
                // Include items so they know exactly what they bought
                items: {
                    include: {
                        product: { select: { name: true, images: true } }
                    }
                },
                // Include vendor info so they see the shop name/logo
                vendor: { 
                    select: { 
                        businessName: true,
                        image: true // Check if your schema uses images or image
                    } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Calculate how much the user spent
        const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

        res.status(200).json({
            success: true,
            count: orders.length,
            totalSpent: totalSpent,
            orders: orders
        });
    } catch (error) {
        console.error("❌ User History Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch your order history" });
    }
}


const ALLOWED_STATUSES = {
  CUSTOMER: ["CANCELLED"],
  VENDOR: ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"],
  CHAMPION: ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"],
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { userId } = getAuth(req);

  if (!id || !status) {
    return res.status(400).json({ success: false, message: "Order ID and status are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true, championProfile: true },
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // 1. Fetch order with vendor relation
    const order = await prisma.order.findUnique({
      where: { id },
      include: { vendor: true, champion: { select: { id: true, userId: true } } },
    });

    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    // 🛡️ GUARD: Prevent updating cancelled or completed orders
    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      return res.status(400).json({ success: false, message: `Cannot modify an order that is already ${order.status}.` });
    }

    // 2. Permission Gatekeeper
    switch (user.role) {
      case "CUSTOMER":
        if (order.customerId !== userId) {
          return res.status(403).json({ success: false, message: "Unauthorized access." });
        }
        if (!ALLOWED_STATUSES.CUSTOMER.includes(status)) {
          return res.status(403).json({ success: false, message: "Customers can only cancel orders." });
        }
        break;

      case "VENDOR":
        if (!user.vendorProfile || order.vendorId !== user.vendorProfile.id) {
          return res.status(403).json({ success: false, message: "Unauthorized. Store ownership check failed." });
        }
        if (!ALLOWED_STATUSES.VENDOR.includes(status)) {
          return res.status(403).json({ success: false, message: "Vendors can only update kitchen or status operations." });
        }
        break;

      case "CHAMPION":
        if (!user.championProfile || order.championId !== user.championProfile.id) {
          return res.status(403).json({ success: false, message: "Unauthorized. You are not assigned to this delivery." });
        }
        if (!ALLOWED_STATUSES.CHAMPION.includes(status)) {
          return res.status(403).json({ success: false, message: "Champions can only update delivery status." });
        }
        break;

      case "ADMIN":
        break;

      default:
        return res.status(403).json({ success: false, message: "Role unauthorized to perform status updates." });
    }

    // 3. Atomic Transaction
    const { updatedOrder, wallet } = await prisma.$transaction(async (tx) => {
      // Step A: Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
      });

      // Step B: Record Status History Log
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
        },
      });

      // -------------------------------------------------------------
      // 💰 VENDOR WALLET CREDIT (Only for PAID orders on acceptance)
      // -------------------------------------------------------------
      const isFirstAcceptance = 
        (status === "PREPARING" || status === "ACCEPTED") &&
        order.status !== "PREPARING" &&
        order.status !== "ACCEPTED";

      if (isFirstAcceptance && order.vendorId) {
        if (order.paymentStatus !== "PAID") {
          throw new Error("UNPAID_ORDER_ACCEPTANCE");
        }

        const txRef = `PENDING-ORDER-${order.orderNumber}`;

        const existingTx = await tx.vendorTransaction.findUnique({
          where: { reference: txRef },
        });

        if (!existingTx) {
          const updatedWallet = await tx.vendorWallet.upsert({
            where: { vendorId: order.vendorId },
            update: {
              pendingBalance: { increment: order.vendorRevenue },
            },
            create: {
              vendorId: order.vendorId,
              pendingBalance: order.vendorRevenue,
              availableBalance: 0,
            },
          });

          await tx.vendorTransaction.create({
            data: {
              walletId: updatedWallet.id,
              amount: order.vendorRevenue,
              type: "CREDIT_PENDING",
              reference: txRef,
              status: "SUCCESS",
              description: `Pending revenue credited for Order #${order.orderNumber}`,
            },
          });
        }
      }

      // -------------------------------------------------------------
      // 🔓 VENDOR WALLET SETTLEMENT (Move Pending -> Available on DELIVERED)
      // -------------------------------------------------------------
      const isDelivered = status === "DELIVERED" && order.status !== "DELIVERED";

      if (isDelivered && order.vendorId) {
        const releaseTxRef = `RELEASE-ORDER-${order.orderNumber}`;

        const existingReleaseTx = await tx.vendorTransaction.findUnique({
          where: { reference: releaseTxRef },
        });

        if (!existingReleaseTx) {
          const updatedWallet = await tx.vendorWallet.update({
            where: { vendorId: order.vendorId },
            data: {
              pendingBalance: { decrement: order.vendorRevenue },
              availableBalance: { increment: order.vendorRevenue },
            },
          });

          await tx.vendorTransaction.create({
            data: {
              walletId: updatedWallet.id,
              amount: order.vendorRevenue,
              type: "RELEASE_PENDING",
              reference: releaseTxRef,
              description: `Payout released to available balance for Order #${order.orderNumber}`,
            },
          });
        }
      }

      // -------------------------------------------------------------
      // 🛵 CHAMPION STATS (When Order becomes DELIVERED)
      // -------------------------------------------------------------
      if (isDelivered && updatedOrder.championId) {
        await tx.champion.update({
          where: { id: updatedOrder.championId },
          data: {
            totalDeliveries: { increment: 1 },
          },
        });
      }

      // Fetch fresh vendor wallet balance to send back
      let currentWallet = null;
      if (order.vendorId) {
        currentWallet = await tx.vendorWallet.findUnique({
          where: { vendorId: order.vendorId },
        });
      }

      return { updatedOrder, wallet: currentWallet };
    });

    notifyOrderStatusChange({
      order,
      newStatus: status,
      actorRole: user.role,
    });

    // Real-time Socket Emissions
    try {
      const io = getIO();
      
      // Emit to Order tracking room
      io.to(`order_${id}`).emit("order_status_updated", {
        orderId: id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
        order: updatedOrder,
        newHistoryItem,
      });

      // Emit directly to Vendor private room
      if (order.vendorId) {
        io.to(`vendor_${order.vendorId}`).emit("vendor_dashboard_updated", {
          orderId: id,
          status: updatedOrder.status,
          order: updatedOrder,
          wallet,
          newHistoryItem,
        });
      }
    } catch (socketErr) {
      console.error("⚠️ Socket emission failed:", socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order: updatedOrder,
      wallet,
    });

  } catch (error) {
    if (error.message === "UNPAID_ORDER_ACCEPTANCE") {
      return res.status(400).json({
        success: false,
        message: "Cannot accept order. Payment has not been confirmed yet.",
      });
    }

    console.error("❌ Status Update Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update order status." });
  }
};


const getOrderTracking = async (req, res) => {
    const { orderId } = req.params;

    try {
        const trackingInfo = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                // Gets the business details
                vendor: { 
                    select: { businessName: true, address: true } 
                },
                // Gets the Champion's profile via the User relation
                champion: { 
                    select: { 
                        name: true, 
                        phone: true,
                        championProfile: { select: { plateNumber : true, vehicleType: true } } 
                    } 
                },
                // The USPS-style timeline dots
                statusHistory: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!trackingInfo) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, order: trackingInfo });
    } catch (error) {
        console.error("❌ Tracking Error:", error);
        res.status(500).json({ success: false, message: "Error fetching tracking details" });
    }
};

const getUserOrders = async (req, res) => {
    const { userId } = getAuth(req);

    try {
        const orders = await prisma.order.findMany({
            where: { customerId: userId },
            include: {
                items: {
                    include: {
                        product: { select: { name: true, images: true, price: true } }
                    }
                },
                vendor: { 
                    select: { 
                        id: true,
                        businessName: true,
                        image: true 
                    } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Format vendor name field so frontend receives vendor.name consistently
        const formattedOrders = orders.map(order => ({
            ...order,
            vendor: order.vendor ? {
                ...order.vendor,
                name: order.vendor.businessName // Normalizing businessName to name
            } : null
        }));

        res.status(200).json({
            success: true,
            count: formattedOrders.length,
            orders: formattedOrders
        });
    } catch (error) {
        console.error("❌ Get User Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders." });
    }
};


const getOrderById = async (req, res) => {
    const { userId } = getAuth(req);
    const { id } = req.params;

    try {
        const order = await prisma.order.findFirst({
            where: { 
                id: id,
                customerId: userId // Ensures users can only view their own orders
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, images: true, price: true } }
                    }
                },
                vendor: { 
                    select: { 
                        id: true,
                        businessName: true,
                        image: true,
                        lat: true,
                        lng: true
                    } 
                }
            }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Normalize vendor.businessName -> vendor.name for frontend UI
        const formattedOrder = {
            ...order,
            vendor: order.vendor ? {
                ...order.vendor,
                name: order.vendor.businessName
            } : null
        };

        res.status(200).json({
            success: true,
            order: formattedOrder
        });
    } catch (error) {
        console.error("❌ Get Order By ID Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch order details." });
    }
};

export { checkout, getCheckoutPreview, getVendorOrderHistory, getUserOrderHistory, updateOrderStatus, getOrderTracking, getUserOrders, getOrderById, retryPayment, calculateDistance, computeCheckoutTotals, handlePaymentCallback, verifyPayment, validateAndCalculateCoupon };