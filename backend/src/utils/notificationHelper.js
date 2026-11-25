import { prisma } from "../config/db.js";
import axios from 'axios';

/**
 * Sends a push notification to a user's active device tokens and records it in the database.
 * 
 * @param {Object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body/message
 * @param {string} [params.type] - Notification type (e.g. "ORDER_PAYMENT_SUCCESS")
 * @param {string} [params.appType] - Target app context ("CUSTOMER" | "VENDOR" | "RIDER"). Omit to send to all user devices.
 * @param {Object} [params.data] - Additional metadata (e.g. { paymentReference, orderId })
 */
export const sendNotification = async ({ userId, title, body, type, appType, data = {} }) => {
  try {
    let orderId = data?.orderId || null;

    if (!orderId && data?.paymentReference) {
      const order = await prisma.order.findFirst({
        where: { transactionId: data.paymentReference },
        select: { id: true },
      });
      if (order) orderId = order.id;
    }

    // 1. Save notification to DB for the user's notification list
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message: body,
        type: type || 'SYSTEM',
        appType,
        orderId,
      },
    });

    // 2. Fetch all device tokens linked to this user (filtered by appType if provided)
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId,
        ...(appType ? { appType } : {}),
      },
      select: { token: true },
    });

    const validTokens = deviceTokens
      .map((dt) => dt.token)
      .filter((token) => token && token.startsWith('ExponentPushToken['));

    // 3. Dispatch Expo Push Notifications
    if (validTokens.length > 0) {
      const pushMessages = validTokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          notificationId: notification.id,
          type,
          orderId,
          ...data,
        },
      }));

      try {
        await axios.post('https://exp.host/--/api/v2/push/send', pushMessages, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        });
        console.log(`📱 Push notification sent to user ${userId} (${validTokens.length} token(s))`);
      } catch (pushErr) {
        console.error('⚠️ Expo Push API failed:', pushErr.response?.data || pushErr.message);
      }
    } else {
      console.log(`ℹ️ User ${userId} has no active Expo push tokens${appType ? ` for appType "${appType}"` : ''}. Saved to DB only.`);
    }

    return notification;
  } catch (error) {
    console.error('❌ Failed to process notification:', error.message);
    throw error;
  }
};


/**
 * Sends a promotional push notification to multiple users simultaneously.
 *
 * @param {Object} params
 * @param {string[]} params.userIds - Array of recipient user IDs
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body/message
 * @param {string} [params.appType] - Target app type (Defaults to "CUSTOMER")
 * @param {Object} [params.data] - Additional payload
 */
export const sendBulkNotification = async ({ userIds, title, body, appType, data = {} }) => {
  try {
    if (!userIds || userIds.length === 0) return;

    // 1. Fetch matching device tokens across targeted users
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        ...(appType ? { appType } : {}),
      },
      select: { token: true },
    });

    // 2. Bulk insert notifications into DB
    const dbNotifications = userIds.map((userId) => ({
      userId,
      title,
      message: body,
      type: 'PROMO',
      appType,
    }));

    await prisma.notification.createMany({
      data: dbNotifications,
    });

    // 3. Format valid push tokens
    const pushMessages = deviceTokens
      .filter((dt) => dt.token && dt.token.startsWith('ExponentPushToken['))
      .map((dt) => ({
        to: dt.token,
        sound: 'default',
        title,
        body,
        data: { type: 'PROMO', ...data },
      }));

    // 4. Batch push notifications in chunks of 100 (Expo API limit)
    const BATCH_SIZE = 100;
    for (let i = 0; i < pushMessages.length; i += BATCH_SIZE) {
      const chunk = pushMessages.slice(i, i + BATCH_SIZE);
      await axios.post('https://exp.host/--/api/v2/push/send', chunk, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`📢 Mass promo sent to ${userIds.length} users (${pushMessages.length} push tokens delivered).`);
  } catch (error) {
    console.error('❌ Failed to send bulk promo notifications:', error.message);
  }
};