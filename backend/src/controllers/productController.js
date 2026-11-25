import { prisma } from '../config/db.js'



const getPublicProducts = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice } = req.query;

        // Build filters array dynamically to avoid empty {} objects
        const filters = [
            {
                vendor: { // or vendorProfile
                    status: "APPROVED",
                    isSuspended: false,
                    isAcceptingOrders: true // Only show shops currently open!
                }
            },
            {
                price: {
                    gte: minPrice ? parseFloat(minPrice) : 0,
                    lte: maxPrice ? parseFloat(maxPrice) : 999999
                }
            }
        ];

        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { vendor: { businessName: { contains: search, mode: 'insensitive' } } }
                ]
            });
        }

        if (category) {
            filters.push({ category: { equals: category, mode: 'insensitive' } });
        }

        const products = await prisma.product.findMany({
            where: { AND: filters },
            include: {
                vendor: { // or vendorProfile
                    select: { businessName: true, id: true, address: true, image: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Search failed" });
    }
};


const getVendorsWithProducts = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        status: "APPROVED",
        isSuspended: false,
        // Optional: Only show vendors that actually have products
        products: { some: {} } 
      },
      include: {
        products: {
            where: { isAvailable: true } // Don't show out-of-stock items
        },
        user: { select: { name: true } }
      }
    });

    res.status(200).json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor inventory" });
  }
}

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};
export { getPublicProducts, getVendorsWithProducts, getCategories }