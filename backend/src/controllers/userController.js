import { getAuth } from '@clerk/express';
import { prisma } from '../config/db.js';


const updateUserProfile = async (req, res) => {
    const { userId } = getAuth(req);
    const { name, phone, homeAddress, latitude, longitude } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                // We only update fields if they are provided in the body
                ...(name && { name }),
                ...(phone && { phone }),
                ...(homeAddress && { homeAddress }),
                ...(latitude != null && { latitude: Number(latitude) }),
                ...(longitude != null && { longitude: Number(longitude) })
            },
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("❌ Update Profile Error:", error);
        
        // Handle P2002 (Prisma unique constraint error for phone number)
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                success: false, 
                message: "This phone number is already in use by another account." 
            });
        }

        res.status(500).json({ success: false, message: "Failed to update profile." });
    }
}

const getUserProfile = async (req, res) => {
  try {
    const user = req.dbUser;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("❌ Get Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile."
    });
  }
};


const getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        address: true,
        image: true,
        isAcceptingOrders: true,
        products: {
          where: { isAvailable: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            images: true,
            category: true,
            stock: true,
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor details' });
  }
};
export { updateUserProfile, getUserProfile, getVendorDetails }