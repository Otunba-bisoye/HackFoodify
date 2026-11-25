import { prisma } from '../config/db.js';
import { getAuth } from '@clerk/express';
import { cloudinary } from '../config/cloudinary.js'
import { OrderStatus, PaymentStatus } from '@prisma/client';

const applyToBeVendor = async (req, res) => {
  const { userId } = getAuth(req);
  const { businessName, address, phone, lat, lng } = req.body;
  const imageFile = req.file;

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized, please sign in" });
  }
  
  if (!businessName || !address || !phone || !lat || !lng) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    let imageUrl = "";

    if (imageFile) {
      const result = await cloudinary.uploader.upload(imageFile.path, {
        folder: "foodify/vendors",
      });
      imageUrl = result.secure_url;
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: userId }
    });

    if (existingVendor) {
      return res.status(400).json({ success: false, message: "You have already applied. We are reviewing your information." });
    }

    // 3. The Magic: Update User AND Create Vendor Profile simultaneously
    const [updatedUser, newVendor] = await prisma.$transaction([
        // Action A: Update the User's phone number
        prisma.user.update({
            where: { id: userId },
            data: { phone: phone }
        }),
        // Action B: Create the Vendor profile
        prisma.vendor.create({
            data: {
                userId,
                businessName,
                address,
                lat: parsedLat,
                lng: parsedLng,
                image: imageUrl || null, 
                status: "PENDING",
                isAcceptingOrders: false
            }
        })
    ]);

    res.status(201).json({
      success: true,
      message: "Application submitted! please, kindly wait for Admin approval.",
      user: updatedUser,
      vendor: newVendor
    });

  } catch (error) {
    console.error("❌ Vendor Application Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized, please sign in" });
    }

    // 1. Fetch vendor directly using userId
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor || vendor.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Only approved vendors can post products.",
      });
    }

    // 2. Check for duplicate product names for this vendor
    const existingProduct = await prisma.product.findFirst({
      where: {
        vendorId: vendor.id,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "You already have a product with this name.",
      });
    }

    // 3. Upload Image to Cloudinary (if provided)
    let imageUrl = "";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "foodify/products",
      });
      imageUrl = result.secure_url;
    }

    // 4. Save to Database
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10) || 1,
        images: imageUrl ? [imageUrl] : [],
        vendor: {
          connect: { id: vendor.id },
        },
        category: {
          connect: { name: category }, // connects using Category ID
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Product listed successfully!",
      product,
    });
  } catch (error) {
    console.error("❌ Create Product Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create product" });
  }
};


const deleteProduct = async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized, please sign in" });
  }

  try {
    // 1. Fetch product along with its order references
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const hasOrders = product.orderItems && product.orderItems.length > 0;

    // 2. SOFT DELETE (Archive) if product was ordered in the past
    if (hasOrders) {
      await prisma.product.update({
        where: { id },
        data: {
          isArchived: true, // Marks product as archived
        },
      });

      return res.status(200).json({
        success: true,
        isArchived: true,
        message: "Product archived successfully as it is linked to past order records.",
      });
    }

    // 3. HARD DELETE if product was NEVER ordered
    // Delete Cloudinary images first
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const regex = /\/v\d+\/(.+)\.[a-zA-Z]+$/;
          const match = imageUrl.match(regex);
          const publicId = match ? match[1] : null;

          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (imgError) {
          console.error(`Failed to delete Cloudinary image (${imageUrl}):`, imgError);
        }
      }
    }

    // Delete record from database
    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      isArchived: false,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("❌ Delete Product Error:", error);
    return res.status(500).json({ success: false, message: "Server error during product deletion" });
  }
};


const updateProduct = async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params;
  const { name, price, description, isAvailable, images, categoryId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized, please sign in" });
  }

  try {
    // 2. Verify product exists and belongs to this vendor
    const existingProduct = await prisma.product.findFirst({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you are not authorized to update it",
      });
    }

    // 3. Clean up removed images from Cloudinary
    if (images && Array.isArray(images)) {
      const removedImages = existingProduct.images.filter(
        (oldImg) => !images.includes(oldImg)
      );

      for (const imageUrl of removedImages) {
        try {
          const parts = imageUrl.split('/');
          const filename = parts.pop().split('.')[0];
          const folder = parts.pop();
          const publicId = `${folder}/${filename}`;

          await cloudinary.uploader.destroy(publicId);
        } catch (imgError) {
          console.error(`Failed to delete removed image (${imageUrl}):`, imgError);
        }
      }
    }

    // 4. Update record in Prisma
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(description !== undefined && { description }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(images !== undefined && { images }),
        ...(categoryId !== undefined && { categoryId }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("❌ Update Product Error:", error);
    return res.status(500).json({ success: false, message: "Server error during product update" });
  }
};

const getMyProducts = async (req, res) => {
  const { userId } = getAuth(req);

  try {
    // 2. Find the vendor profile associated with this User
    const vendor = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        vendorProfile: {
          select: { id: true }
        }
      }
    });

    if (!vendor?.vendorProfile) {
      return res.status(404).json({ 
        success: false, 
        message: "Vendor profile not found for this user." 
      });
    }

    const vendorId = vendor.vendorProfile.id;

    // 3. Fetch products belonging ONLY to this vendor
    const products = await prisma.product.findMany({
    where: {
      vendorId: vendorId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

    res.status(200).json({ success: true, products });
    
  } catch (error) {
    console.error("❌ Load Products Error:", error);
    res.status(500).json({ success: false, message: "Could not load your products" });
  }
}


const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error('Get single product error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const toggleVendorAcceptingOrders = async (req, res) => {
    const { userId } = getAuth(req);
    const { isAcceptingOrders } = req.body; // true or false

    try {
        const updatedVendor = await prisma.vendor.update({
            where: { userId: userId },
            data: { isAcceptingOrders: isAcceptingOrders }
        });

        const statusMessage = updatedVendor.isAcceptingOrders 
            ? "Your shop is now OPEN and accepting orders." 
            : "Your shop is now CLOSED to new orders.";

        res.status(200).json({ 
            success: true, 
            isAcceptingOrders: updatedVendor.isAcceptingOrders,
            message: statusMessage 
        });
    } catch (error) {
        console.error("❌ Toggle Vendor Status Error:", error);
        res.status(500).json({ success: false, message: "Failed to update shop status." });
    }
}

const getVendorProfile = async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
    });

    // If no vendor record exists, vendor will be `null`
    return res.status(200).json({
      vendor: vendor || null,
      hasProfile: !!vendor,
    });
  } catch (error) {
    console.error('❌ Error fetching vendor profile:', error);
    return res.status(500).json({ message: 'Server error fetching vendor profile.' });
  }
};


const getVendorMetrics = async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(200).json({ message: 'Vendor profile not found' });
    }

    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const validSalesFilter = {
      notIn: ['CANCELLED'],
    };

    // Execute aggregated queries AND wallet fetch concurrently in parallel
    const [todayAgg, weeklyAgg, monthlyAgg, totalOrdersCount, wallet] = await Promise.all([
      // Today's Sales & Orders Count
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          vendorId: vendor.id,
          createdAt: { gte: startOfToday },
          status: validSalesFilter,
        },
      }),

      // Weekly Sales & Orders Count
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          vendorId: vendor.id,
          createdAt: { gte: startOfWeek },
          status: validSalesFilter,
        },
      }),

      // Monthly Sales & Orders Count
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          vendorId: vendor.id,
          createdAt: { gte: startOfMonth },
          status: validSalesFilter,
        },
      }),

      // All-Time Total Orders Count
      prisma.order.count({
        where: { vendorId: vendor.id },
      }),

      // Vendor Wallet Balances (In Escrow & Available Cash)
      prisma.vendorWallet.findUnique({
        where: { vendorId: vendor.id },
      }),
    ]);

    const metricsData = {
      todaySales: todayAgg._sum.totalAmount || 0,
      todayOrders: todayAgg._count.id || 0,
      weeklySales: weeklyAgg._sum.totalAmount || 0,
      weeklyOrders: weeklyAgg._count.id || 0,
      monthlySales: monthlyAgg._sum.totalAmount || 0,
      monthlyOrders: monthlyAgg._count.id || 0,
      totalOrders: totalOrdersCount || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      availableBalance: wallet?.availableBalance || 0,
    };

    // Spread metrics at root and return nested for frontend compatibility
    return res.status(200).json({
      ...metricsData,
      metrics: metricsData,
    });
  } catch (error) {
    console.error('❌ Error fetching vendor metrics:', error);
    return res.status(500).json({ message: 'Server error fetching metrics' });
  }
};


const fetchOrders = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Resolve Vendor ID from Clerk userId
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(200).json({ success: false, message: 'Vendor profile not found' });
    }

    // 2. Fetch all active orders for this vendor
    const orders = await prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        paymentStatus: PaymentStatus.PAID,
        status: {
          in: [
            OrderStatus.PAYMENT_CONFIRMED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
          ],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 3. Format response for frontend consumption
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      deliveryAddress: order.deliveryAddress,
      customerName: order.customer.name,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        image: item.product.images[0] || null,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    }));

    return res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};


const getVendorOrderDetail = async ( req, res ) => {
  try {
    const { id } = req.params;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(200).json({ success: false, message: 'Vendor profile not found' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        vendorId: vendor.id, 
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                images: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        customer: { // Changed from 'user' to 'customer'
          select: {
            name: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Format response payload
    const formattedOrder = {
      ...order,
      customerName: order.user?.name || 'Customer',
    };

    return res.status(200).json({ order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const addBankDetails = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { bankName, bankCode, accountNumber, accountName } = req.body;

    // 1. Validation
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        message: 'Bank name, account number, and account name are required.',
      });
    }

    if (accountNumber.trim().length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Account number must be exactly 10 digits.',
      });
    }

    // 2. Locate vendor by logged-in user ID
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    // 3. Update Vendor bank details
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        bankName: bankName.trim(),
        bankCode: bankCode.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      },
    });

    // 4. Return success response
    return res.status(200).json({
      success: true,
      message: 'Bank details saved successfully.',
      bankDetails: {
        bankName: updatedVendor.bankName,
        accountNumber: updatedVendor.accountNumber,
        accountName: updatedVendor.accountName,
      },
    });
  } catch (error) {
    console.error('Error saving bank details:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while saving bank details.',
    });
  }
};


const getVendorTransactions = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    // Find vendor and associated wallet
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: { wallet: true },
    });

    if (!vendor || !vendor.wallet) {
      return res.status(404).json({ message: 'Vendor or wallet not found' });
    }

    // Fetch transactions sorted by latest
    const transactions = await prisma.vendorTransaction.findMany({
      where: { walletId: vendor.wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 most recent records
    });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('❌ Error fetching vendor transactions:', error);
    return res.status(500).json({ message: 'Failed to retrieve transactions' });
  }
};

export { applyToBeVendor, createProduct, deleteProduct, getMyProducts, toggleVendorAcceptingOrders, getVendorTransactions, getVendorProfile, getVendorMetrics, fetchOrders, getVendorOrderDetail, updateProduct, getProductDetails, getCategories, addBankDetails }