import { prisma } from '../config/db.js'
import { cloudinary } from '../config/cloudinary.js';


const applyToBeChampion = async (req, res) => {
    try {
        // 1. Extract phone alongside the vehicle details
        const { vehicleType, plateNumber, city, phone } = req.body; 
        const { userId } = req.auth;
        const files = req.files;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized, please sign in" });
        }
        
        if (!files) {
            return res.status(400).json({ success: false, message: "Please upload your vehicle documents" });
        }

        // 2. Validate phone is included
        if (!vehicleType || !plateNumber || !city || !phone) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const existingApplication = await prisma.champion.findUnique({
            where: { userId: userId }
        });

        if (existingApplication) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already submitted an application." 
            });
        }

        const uploadPromises = files.map(file => 
            cloudinary.uploader.upload(file.path, { folder: "foodify/champions" })
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        const imageUrls = uploadResults.map(result => result.secure_url);

        // 3. The Magic: Update User AND Create Champion Profile at the same time
        const [updatedUser, newChampion] = await prisma.$transaction([
            // Action A: Save the phone number to the User table
            prisma.user.update({
                where: { id: userId },
                data: { phone: phone }
            }),
            // Action B: Save the application to the Champion table
            prisma.champion.create({
                data: {
                    userId,
                    vehicleType,
                    plateNumber,
                    city,
                    documents: imageUrls,
                    status: "PENDING"
                }
            })
        ]);

        res.status(201).json({
            success: true,
            user: updatedUser,
            champion: newChampion,
            message: "Application submitted! Kindly visit our nearest branch for inspection."
        });

    } catch (error) {
        console.error("❌ Champion Application Error:", error);
        res.status(500).json({ success: false, message: "Failed to submit application." });
    }
}


const toggleChampionStatus = async (req, res) => {
    const { userId } = req.auth
    const { isOnline } = req.body;

    try {
        const updated = await prisma.champion.update({
            where: { userId: userId },
            data: { isOnline: isOnline }
        });
        res.status(200).json({ success: true, isOnline: updated.isOnline });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not change online status." });
    }
}


const getChampionActiveTask = async (req, res) => {
    const userId = req.headers['x-user-id'];

    try {
        const activeOrder = await prisma.order.findFirst({
            where: {
                championId: userId,
                status: { in: ['PICKED_UP', 'OUT_FOR_DELIVERY'] }
            },
            include: {
                vendor: { select: { businessName: true, address: true, phone: true } },
                items: { include: { product: { select: { name: true } } } }
            }
        });

        if (!activeOrder) {
            return res.status(200).json({ success: true, activeOrder: null, message: "No active delivery." });
        }

        res.status(200).json({ success: true, activeOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching active task." });
    }
}


const getChampionStats = async (req, res) => {
    const { userId } = req.auth;

    try {
        // 1. Run both queries in parallel
        const [championData, earningsData] = await Promise.all([
            prisma.champion.findUnique({
                where: { userId: userId },
                select: { rating: true, totalDeliveries: true }
            }),
            // 2. Use _sum to let the DB calculate total revenue
            prisma.order.aggregate({
                where: {
                    championId: userId,
                    status: 'DELIVERED'
                },
                _sum: {
                    totalAmount: true
                }
            })
        ]);

        if (!championData) {
            return res.status(404).json({ success: false, message: "Champion profile not found." });
        }

        // 3. Apply the 10% delivery fee logic
        const rawTotal = Number(earningsData._sum.totalAmount || 0);
        const championEarnings = (rawTotal * 0.10).toFixed(2);

        res.status(200).json({
            success: true,
            stats: {
                rating: championData.rating,
                deliveries: championData.totalDeliveries,
                earnings: championEarnings // e.g., "1500.00"
            }
        });
    } catch (error) {
        console.error("❌ Stats Error:", error);
        res.status(500).json({ success: false, message: "Error fetching stats." });
    }
}


const getAvailableOrders = async (req, res) => {     //for champions
    try {
        const availableOrders = await prisma.order.findMany({
            where: {
                status: "READY_FOR_PICKUP",
                championId: null // 👈 Only show orders that need a Champion
            },
            include: {
                vendor: {
                    select: {
                        businessName: true,
                        address: true, // champion needs to know where to go!
                        image: true
                    }
                },
                // We don't necessarily need every item here, 
                // but the count is helpful for the champion.
                _count: {
                    select: { items: true }
                }
            },
            orderBy: {
                createdAt: 'asc' // Oldest orders first so customers don't wait too long
            }
        });

        res.status(200).json({success: true, availableOrders});
    } catch (error) {
        console.error("❌ Fetch Available Orders Error:", error);
        res.status(500).json({ success: false, message: "Could not load available deliveries." });
    }
}

const claimOrder = async (req, res) => {
    const { orderId } = req.params;
    const { userId } = req.auth;

    const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: "User not found" });
        
        const userRole = user.role

    if (userRole !== "CHAMPION") {
        return res.status(403).json({ success: false, message: "Only Champions can claim orders." });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            
            if (!order) throw new Error("NOT_FOUND");
            if (order.championId !== null) throw new Error("ALREADY_CLAIMED");
            if (order.status !== "READY_FOR_PICKUP") throw new Error("NOT_READY");

            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    championId: userId,
                    status: "PICKED_UP"
                }
            });

            await tx.orderStatusHistory.create({
                data: { orderId: orderId, status: "PICKED_UP" }
            });

            return updated;
        }, {
            timeout: 15000 // 🛡️ Give it 15 seconds to complete!
        });

        res.status(200).json({ success: true, message: "Order claimed! Move to delivery.", order: result });
    } catch (error) {
        console.error("❌ Claim Error Details:", error)
        let msg = "Failed to claim order.";
        if (error.message === "ALREADY_CLAIMED") msg = "This order has already been claimed by another rider.";
        if (error.message === "NOT_READY") msg = "This order is still being prepared and cannot be claimed yet.";
        if (error.message === "NOT_FOUND") msg = "Order not found.";
        
        res.status(400).json({ success: false, message: msg });
    }
}

const completeOrder = async (req, res) => {
    const { orderId } = req.params;
    const userId = req.headers['x-user-id']; // The Champion's User ID

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Order Status & Ensure it's already PAID
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: { 
                    status: "DELIVERED",
                    paymentStatus: "PAID" // Extra safety check
                }
            });

            // 2. Add the Final Dot to the USPS Timeline
            await tx.orderStatusHistory.create({
                data: {
                    orderId: orderId,
                    status: "DELIVERED"
                }
            });

            // 3. Update Champion Stats & Reset Availability
            await tx.champion.update({
                where: { userId: userId },
                data: {
                    totalDeliveries: { increment: 1 }, // 👈 +1 to their career stats
                    isAvailable: true // 👈 They can now see new orders on the board
                }
            });

            return updatedOrder;
        });

        res.status(200).json({ 
            success: true, 
            message: "Delivery confirmed! Great job, Champion.", 
            order: result 
        });

    } catch (error) {
        console.error("❌ Completion Error:", error);
        res.status(500).json({ success: false, message: "Failed to complete delivery." });
    }
}


export { applyToBeChampion, toggleChampionStatus, getChampionActiveTask, getChampionStats, getAvailableOrders, claimOrder, completeOrder}