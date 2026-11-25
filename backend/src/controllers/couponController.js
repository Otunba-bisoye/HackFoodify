import { prisma } from '../config/db.js';
import { validateAndCalculateCoupon } from './orderController.js'
import { getAuth } from '@clerk/express';


/**
 * @route   GET /api/v1/coupons/my-coupons
 * @desc    Get available, active, and used coupons for the authenticated customer
 * @access  Private (Customer)
 */
export const getMyCoupons = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: { isActive: true },
      include: {
        usages: {
          where: { userId },
          include: {
            order: {
              select: { groupOrderId: true, transactionId: true },
            },
          },
        },
        vendor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const availableCoupons = [];
    const usedCoupons = [];

    coupons.forEach((coupon) => {
      // 🔑 Count UNIQUE checkout sessions (groupOrderId) rather than raw usage rows
      const uniqueCheckouts = new Set(
        coupon.usages.map((u) => u.order?.groupOrderId || u.orderId)
      );
      const timesUsed = uniqueCheckouts.size;

      const totalAllowed = coupon.userUsageLimit || 1; // Default to 1 if null
      const isGlobalCapReached =
        coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
      const isExpired = coupon.endDate && new Date(coupon.endDate) < now;
      const isNotStarted = coupon.startDate && new Date(coupon.startDate) > now;

      // Generate an item for each user usage slot
      for (let i = 1; i <= totalAllowed; i++) {
        const isThisInstanceUsed = i <= timesUsed;
        const isAvailable =
          !isThisInstanceUsed && !isGlobalCapReached && !isExpired && !isNotStarted;

        const couponInstance = {
          id: `${coupon.id}-instance-${i}`,
          couponId: coupon.id,
          code: coupon.code,
          instanceNumber: i,
          totalAllowed,
          discountType: coupon.discountType,
          discountTarget: coupon.discountTarget,
          discountValue: coupon.discountValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
          minOrderAmount: coupon.minOrderAmount,
          vendorId: coupon.vendorId,
          vendorName: coupon.vendor?.businessName || null,
          isAvailable,
          isUsed: isThisInstanceUsed,
        };

        if (isThisInstanceUsed) {
          usedCoupons.push(couponInstance);
        } else if (isAvailable) {
          availableCoupons.push(couponInstance);
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        available: availableCoupons,
        used: usedCoupons,
      },
    });
  } catch (error) {
    console.error('Error fetching customer coupons:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * @route   POST /api/v1/coupons/admin/create
 * @desc    Create a new coupon (Admin route / Postman seeding)
 * @access  Private (Admin)
 */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountTarget,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      minVendorCount,
      maxVendorCount,
      startDate,
      endDate,
      usageLimit,
      userUsageLimit,
      isActive,
      vendorId,
    } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Code, discountType, and discountValue are required fields.',
      });
    }

    const formattedCode = code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code: formattedCode },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Coupon with code '${formattedCode}' already exists.`,
      });
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: formattedCode,
        discountType,
        discountTarget: discountTarget || 'DELIVERY',
        discountValue: Number(discountValue),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        minVendorCount: minVendorCount ? Number(minVendorCount) : null,
        maxVendorCount: maxVendorCount ? Number(maxVendorCount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        userUsageLimit: userUsageLimit !== undefined ? Number(userUsageLimit) : 1,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        vendorId: vendorId || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully!',
      data: newCoupon,
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};