import { prisma } from "../config/db.js"
import { cloudinary } from "../config/cloudinary.js"
import { sendBulkNotification } from "../utils/notificationHelper.js";


const getPendingVendors = async (req, res) => {
  try {
    const pendingVendors = await prisma.vendor.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          },
        },
      },
      orderBy: {
        id: 'desc' // Newest applications first
      }
    });

    res.status(200).json({
      success: true,
      count: pendingVendors.length,
      data: pendingVendors,
    });
  } catch (error) {
    console.error("❌ Fetch Pending Vendors Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching applications" });
  }
};


const getPendingChampions = async (req, res) => {
    try {
        const pendingChampions = await prisma.champion.findMany({
            where: {
                status: "PENDING"
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' // Newest applications first
            }
        });

        res.status(200).json({
            success: true,
            count: pendingChampions.length,
            data: pendingChampions
        });
    } catch (error) {
        console.error("❌ Get Pending Champions Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch pending applications." });
    }
};

const updateVendorStatus = async (req, res) => {
    const { id } = req.params; // The Vendor ID
    const { status } = req.body; // Expecting "APPROVED" or "REJECTED"

    // 1. Validate the status input
    const validStatuses = ["APPROVED", "REJECTED", "PENDING"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status provided." });
    }

    try {
        // 2. Find the vendor to get the associated userId
        const vendor = await prisma.vendor.findUnique({
            where: { id: id }
        });

        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found." });
        }

        // 3. Run a Transaction: Update Vendor Status AND User Role
        const updatedData = await prisma.$transaction(async (tx) => {
            // Update the Vendor status
            const updatedVendor = await tx.vendor.update({
                where: { id: id },
                data: { status: status }
            });

            // If APPROVED, ensure the User's role is set to VENDOR
            // If REJECTED, you might want to keep them as CUSTOMER
            const newRole = status === "APPROVED" ? "VENDOR" : "CUSTOMER";
            
            await tx.user.update({
                where: { id: vendor.userId },
                data: { role: newRole }
            });

            return updatedVendor;
        });

        res.status(200).json({ 
            success: true,
            message: `Vendor has been ${status.toLowerCase()}.`, 
            vendor: updatedData 
        });
    } catch (error) {
        console.error("❌ Moderation Error:", error);
        res.status(500).json({ success: false, message: "Failed to update vendor status." });
    }
}


const updateChampionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expecting "APPROVED" or "REJECTED"

        // 1. Validate the status input
        const validStatuses = ["APPROVED", "REJECTED", "PENDING"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status provided" });
        }

        // 2. Update the Champion record
        const champion = await prisma.champion.update({
            where: { id: id },
            data: { status: status },
        });

        // 3. If APPROVED, upgrade the User role
        if (status === "APPROVED") {
            await prisma.user.update({
                where: { id: champion.userId },
                data: { role: "CHAMPION" }
            });
        }

        const message = status === "APPROVED" 
            ? "Champion approved and role updated!" 
            : "Champion application rejected.";

        res.status(200).json({
            success: true,
            message: message
        });

    } catch (error) {
        console.error("❌ Champion Status Update Error:", error);
        res.status(500).json({ success: false, message: "Failed to update champion status." });
    }
}



const toggleSuspension = async (req, res) => {
    try {
        const { id } = req.params; // Vendor or Champion ID
        const { type, isSuspended } = req.body; // type: "vendor" | "champion", isSuspended: true/false

        let updatedUser;

        if (type === "vendor") {
            updatedUser = await prisma.vendor.update({
                where: { id: id },
                data: { isSuspended: isSuspended }
            });
        } else if (type === "champion") {
            updatedUser = await prisma.champion.update({
                where: { id: id },
                data: { isSuspended: isSuspended }
            });
        } else {
            return res.status(400).json({ success: false, message: "Invalid type provided." });
        }

        const action = isSuspended ? "SUSPENDED" : "REINSTATED";
        
        res.status(200).json({ 
            success: true, 
            message: `${type} has been ${action} successfully.`,
            isSuspended: updatedUser.isSuspended 
        });

    } catch (error) {
        console.error("❌ Toggle Suspension Error:", error);
        res.status(500).json({ success: false, message: "Failed to toggle suspension." });
    }
};


const removeVendor = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch data first (Get out of the way)
        const vendor = await prisma.vendor.findUnique({
            where: { id: id },
            include: { products: true }
        });

        if (!vendor) return res.status(404).json({ error: "Vendor not found" });

        // 2. Handle Cloudinary cleanup OUTSIDE the transaction
        // Collect all images (Vendor profile + all product images)
        const imageToUrls = [];
        if (vendor.image) imageToUrls.push(vendor.image); // Check if your field is 'image' or 'imageUrl'
        vendor.products.forEach(p => {
            if (p.images && p.images.length > 0) imageToUrls.push(p.images[0]);
        });

        if (imageToUrls.length > 0) {
            const deleteImagePromises = imageToUrls.map(url => {
                const publicId = url.split('/').slice(-2).join('/').split('.')[0];
                return cloudinary.uploader.destroy(publicId);
            });
            // We wait for Cloudinary here, but the DB transaction hasn't started yet!
            await Promise.all(deleteImagePromises);
        }
         //olabisiajoke1954@gmail.com
         //$Ajoke123
        // 3. NOW start the Transaction (Only DB work = super fast)
        await prisma.$transaction([
            prisma.product.deleteMany({ where: { vendorId: id } }),
            prisma.vendor.delete({ where: { id: id } }),
            prisma.user.update({
                where: { id: vendor.userId },
                data: { role: "CUSTOMER" }
            })
        ]);

        res.status(200).json({ message: "Vendor and all data removed successfully." });

    } catch (error) {
        console.error("❌ Deep Remove Error:", error);
        res.status(500).json({ error: "Failed to fully remove vendor." });
    }
};


const deleteChampion = async (req, res) => {
    const { id } = req.params;

    try {
        const champion = await prisma.champion.findUnique({
            where: { id: id }
        });

        if (!champion) {
            return res.status(404).json({ success: false, message: "Champion not found." });
        }

        // 1. Cloudinary Cleanup (Do this outside the DB transaction)
        if (champion.documents && champion.documents.length > 0) {
            const deletePromises = champion.documents.map(url => {
                const parts = url.split('/');
                const fileName = parts[parts.length - 1].split('.')[0];
                const folder = "town-deck/champions"; 
                return cloudinary.uploader.destroy(`${folder}/${fileName}`);
            });
            await Promise.all(deletePromises);
        }

        // 2. PRISMA TRANSACTION (The "All or Nothing" block)
        await prisma.$transaction([
            // Task A: Delete the Champion
            prisma.champion.delete({
                where: { id: id }
            }),
            // Task B: Revert User Role (Using CUSTOMER to match your Enum)
            prisma.user.update({
                where: { id: champion.userId },
                data: { role: "CUSTOMER" }
            })
        ]);

        res.status(200).json({ 
            success: true, 
            message: "Champion deleted and user role reverted to Customer." 
        });

    } catch (error) {
        console.error("❌ Transaction Delete Error:", error);
        res.status(500).json({ success: false, message: "Failed to complete deletion." });
    }
}



const getAllVendors = async (req, res) => {
    try {
        const vendors = await prisma.vendor.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true
                    }
                }
                // Notice: We are NOT including "products" here 
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });
    } catch (error) {
        console.error("❌ Get All Vendors Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch vendors list." });
    }
}


const getAllChampions = async (req, res) => {
    try {
        const champions = await prisma.champion.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: champions.length,
            data: champions
        });
    } catch (error) {
        console.error("❌ Get All Champions Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch champions list." });
    }
}


const broadcastPromo = async (req, res) => {
  const { title, body, promoCode } = req.body;

  // Get all active user IDs
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map((u) => u.id);

  // Trigger background job without blocking HTTP response
  sendBulkNotification({
    userIds,
    title,
    body,
    data: { promoCode },
  });

  return res.status(200).json({
    success: true,
    message: `Broadcast started for ${userIds.length} users.`,
  });
};

export { getPendingVendors, getPendingChampions, updateVendorStatus, updateChampionStatus, toggleSuspension, removeVendor, deleteChampion, getAllVendors, getAllChampions, broadcastPromo}