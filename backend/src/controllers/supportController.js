import { prisma } from '../config/db.js';
import { getAuth } from '@clerk/express';

// GET /api/support/messages
export const getSupportMessages = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 1. Fetch support chat history
    const messages = await prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Mark unread ADMIN messages as read when customer opens chat
    await prisma.supportMessage.updateMany({
      where: {
        userId,
        senderRole: 'ADMIN',
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching support messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch support chat history' });
  }
};

// POST /api/support/messages
export const sendSupportMessage = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        userId,
        senderRole: 'CUSTOMER',
        message: message.trim(),
      },
    });

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending support message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

// GET /api/support/unread-count (For notification badge on support button)
export const getUnreadSupportCount = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const unreadCount = await prisma.supportMessage.count({
      where: {
        userId,
        senderRole: 'ADMIN',
        isRead: false,
      },
    });

    res.json({ success: true, count: unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
};