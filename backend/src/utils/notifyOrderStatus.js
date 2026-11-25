import { sendNotification } from "./notificationHelper.js";

/**
 * Sends push notifications to all relevant parties (Customer, Vendor, Champion)
 * for status changes, including self-confirmation alerts for the actor.
 */
export const notifyOrderStatusChange = async ({ order, newStatus, actorRole }) => {
  try {
    const orderId = order.id;
    const orderNum = order.orderNumber || order.id.slice(-6);

    switch (newStatus) {
      case "ACCEPTED":
      case "PREPARING":
        // 1. Customer Alert
        await sendNotification({
          userId: order.customerId,
          title: "Order Accepted! 🍳",
          body: `Your order #${orderNum} has been accepted and is now being prepared.`,
          type: "ORDER_ACCEPTED",
          appType: "CUSTOMER",
          data: { orderId },
        });

        // 2. Vendor Confirmation
        if (order.vendor?.userId) {
          await sendNotification({
            userId: order.vendor.userId,
            title: "Order Accepted 👨‍🍳",
            body: `You successfully accepted order #${orderNum}. It is now set to ${newStatus}.`,
            type: "VENDOR_ORDER_ACCEPTED",
            appType: "VENDOR",
            data: { orderId },
          });
        }
        break;

      case "READY":
        // 1. Customer Alert
        await sendNotification({
          userId: order.customerId,
          title: "Order Ready! 📦",
          body: `Your order #${orderNum} is prepared and ready for pickup/delivery.`,
          type: "ORDER_READY",
          appType: "CUSTOMER",
          data: { orderId },
        });

        // 2. Vendor Confirmation
        if (order.vendor?.userId) {
          await sendNotification({
            userId: order.vendor.userId,
            title: "Order Marked as Ready ✅",
            body: `Order #${orderNum} is now marked ready. Awaiting rider pickup.`,
            type: "VENDOR_ORDER_READY",
            appType: "VENDOR",
            data: { orderId },
          });
        }

        // 3. Champion Alert (if assigned)
        if (order.champion?.userId) {
          await sendNotification({
            userId: order.champion.userId,
            title: "Order Ready for Pickup 🛵",
            body: `Order #${orderNum} at ${order.vendor?.storeName || "the store"} is ready for pickup.`,
            type: "ORDER_READY_FOR_PICKUP",
            appType: "RIDER",
            data: { orderId },
          });
        }
        break;

      case "IN_TRANSIT":
      case "OUT_FOR_DELIVERY":
        // 1. Customer Alert
        await sendNotification({
          userId: order.customerId,
          title: "On the Way! 🛵",
          body: `Your rider is on the way with order #${orderNum}.`,
          type: "ORDER_OUT_FOR_DELIVERY",
          appType: "CUSTOMER",
          data: { orderId },
        });

        // 2. Champion Confirmation
        if (order.champion?.userId) {
          await sendNotification({
            userId: order.champion.userId,
            title: "Delivery Started 🛵",
            body: `You have picked up order #${orderNum} and marked it as ${newStatus.replace("_", " ")}.`,
            type: "CHAMPION_OUT_FOR_DELIVERY",
            appType: "RIDER",
            data: { orderId },
          });
        }
        break;

      case "DELIVERED":
        // 1. Customer Alert
        await sendNotification({
          userId: order.customerId,
          title: "Order Delivered! 🎉",
          body: `Your order #${orderNum} has been delivered. Enjoy your meal!`,
          type: "ORDER_DELIVERED",
          appType: "CUSTOMER",
          data: { orderId },
        });

        // 2. Vendor Payout Notification
        if (order.vendor?.userId) {
          await sendNotification({
            userId: order.vendor.userId,
            title: "Order Completed 💰",
            body: `Order #${orderNum} has been delivered. Payout released to your available balance!`,
            type: "ORDER_DELIVERED_VENDOR",
            appType: "VENDOR",
            data: { orderId },
          });
        }

        // 3. Champion Confirmation
        if (order.champion?.userId) {
          await sendNotification({
            userId: order.champion.userId,
            title: "Delivery Completed! ✅",
            body: `You successfully marked order #${orderNum} as delivered. Great job!`,
            type: "CHAMPION_DELIVERY_COMPLETE",
            appType: "RIDER",
            data: { orderId },
          });
        }
        break;

      case "CANCELLED":
        // 1. Customer Alert
        await sendNotification({
          userId: order.customerId,
          title: "Order Cancelled ❌",
          body: `Order #${orderNum} has been cancelled.`,
          type: "ORDER_CANCELLED",
          appType: "CUSTOMER",
          data: { orderId },
        });

        // 2. Vendor Alert (if vendor didn't initiate cancellation)
        if (order.vendor?.userId && actorRole !== "VENDOR") {
          await sendNotification({
            userId: order.vendor.userId,
            title: "Order Cancelled ⚠️",
            body: `Order #${orderNum} was cancelled.`,
            type: "VENDOR_ORDER_CANCELLED",
            appType: "VENDOR",
            data: { orderId },
          });
        }
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("❌ Failed to dispatch status notifications:", error.message);
  }
};