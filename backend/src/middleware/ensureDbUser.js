import { clerkClient, getAuth } from '@clerk/express';
import { prisma } from '../config/db.js';

export const ensureDbUser = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    // 1. Check local Postgres DB
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // 2. JIT Sync if user isn't in DB yet
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Customer';

      user = await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: primaryEmail,
          name: fullName,
          role: 'CUSTOMER',
        },
      });
      console.log(`⚡ JIT Sync: User ${userId} synced.`);
    }

    req.dbUser = user;
    next();
  } catch (error) {
    console.error('❌ ensureDbUser error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};