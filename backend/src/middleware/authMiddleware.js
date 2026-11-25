import { prisma } from '../config/db.js';
import { getAuth } from '@clerk/express';

export const isAdmin = async (req, res, next) => {
    // We expect the frontend to send the Clerk User ID in the headers
    const { userId } = getAuth(req);

    if (!userId) {
        return res.status(401).json({ error: "Authentication required, please sign in." });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (user && user.role === 'ADMIN') {
            next(); // User is Admin, proceed to the controller
        } else {
            res.status(403).json({ error: "Access denied. Admins only." });
        }
    } catch (error) {
        res.status(500).json({ error: "Security check failed." });
    }
};

export const isVendor = async (req, res, next) => {
  const { userId } = getAuth(req)

  if (!userId) {
      return res.status(401).json({ error: "Authentication required, please sign in." });
  }
  try{
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
  } catch{
    
  }
}

export const isProductOwnerOrAdmin = async (req, res, next) => {
  const { userId } = getAuth(req);
  const { id } = req.params; // Product ID

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    // 1. Fetch user and product at the same time
    const [user, product] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { vendorProfile: true },
      }),
      prisma.product.findUnique({ where: { id } }),
    ]);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // 2. Permission Check using vendorProfile
    const vendorId = user?.vendorProfile?.id;
    const isOwner = vendorId && vendorId === product.vendorId;
    const isAdmin = user?.role === "ADMIN";

    if (isAdmin || isOwner) {
      req.vendorId = vendorId;
      req.product = product; // Attach product so controller doesn't need to re-fetch
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You don't own this product.",
      });
    }
  } catch (error) {
    console.error("❌ Permission Check Error:", error);
    return res.status(500).json({ success: false, message: "Permission check failed" });
  }
};


export const checkSuspension = async (req, res, next) => {
    const { userId } = getAuth(req)

    // Check both tables - a user might be a vendor OR a champion
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    const champion = await prisma.champion.findUnique({ where: { userId } });

    if ((vendor && vendor.isSuspended) || (champion && champion.isSuspended)) {
        return res.status(403).json({ 
            success: false, 
            message: "Your account is currently suspended. Please contact Foodify support."
        });
    }

    next();
};