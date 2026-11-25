import { prisma } from '../config/db.js';
import { getAuth } from '@clerk/express';

// GET /api/notifications
export const getUserNotifications = async (req, res) => {
  const { userId } = getAuth(req);
  const { appType } = req.query;

  if (!userId) {
        return res.status(401).json({ success:false, message: "Unauthorized! please log in" });
    }
  try {
    const whereClause = {
      userId,
      ...(appType ? { appType } : {}),
    };
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 30, // Limit to recent 30 notifications
    });

    const unreadCount = await prisma.notification.count({
      where: { ...whereClause, isRead: false },
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/mark-read
export const markNotificationsAsRead = async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params;

  try {
    await prisma.notification.updateMany({
      where: {id, userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const updatePushToken = async (req, res) => {
  try {
    const userId = req.dbUser.id;
    const { pushToken, appType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const validAppTypes = ['CUSTOMER', 'VENDOR', 'CHAMPION'];
    if (!validAppTypes.includes(appType)) {
      return res.status(400).json({ error: 'Invalid appType provided' });
    }

    // Upsert ensures the token is updated to the active user & appType without unique constraint crashes
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token: pushToken },
      update: {
        userId,
        appType,
        updatedAt: new Date(),
      },
      create: {
        token: pushToken,
        appType,
        userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Push token updated successfully',
      data: deviceToken,
    });
  } catch (error) {
    console.error('Error saving push token:', error);
    return res.status(500).json({ error: 'Failed to update push token' });
  }
};