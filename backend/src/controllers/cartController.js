import { prisma } from '../config/db.js';
import { getAuth } from '@clerk/express';


const addToCart = async (req, res) => {
    // 1. Get userId from auth middleware (Clerk) instead of trust from body
    const { userId } = getAuth(req);
    const { productId, quantity } = req.body;

    try {
        // 2. We need to find the product first to get the vendorId
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { vendorId: true } // Only grab what we need
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const cartItem = await prisma.cartItem.upsert({
            where: {
                // Prisma automatically names the unique constraint like this
                userId_productId: {
                    userId: userId,
                    productId: productId,
                },
            },
            update: {
                quantity: { increment: quantity || 1 },
            },
            create: {
                userId: userId,
                productId: productId,
                vendorId: product.vendorId,
                quantity: quantity || 1,
            },
        });

        res.status(200).json({ success: true, message: "Product Added to Cart Successfully" });
    } catch (error) {
        console.error("❌ Cart Error:", error);
        res.status(500).json({ error: "Could not update cart" });
    }
};

const removeFromCart = async (req, res) => {
    const { userId } = getAuth(req);
    const { productId } = req.params;

    try {
        const existingItem = await prisma.cartItem.findUnique({
            where: { userId_productId: { userId, productId } }
        });

        if (!existingItem) return res.status(404).json({ success:false, message: "Item not in cart." });

        if (existingItem.quantity > 1) {
            const updated = await prisma.cartItem.update({
                where: { userId_productId: { userId, productId } },
                data: { quantity: { decrement: 1 } }
            });
            res.status(200).json({success:true, updated});
        } else {
            // If quantity was 1, just delete it
            await prisma.cartItem.delete({
                where: { userId_productId: { userId, productId } }
            });
            res.status(200).json({ success: true, message: "Item removed from cart." });
        }

    } catch (error) {
        console.error("❌ Remove Error:", error);
        res.status(500).json({ success: false, message: "Could not update cart." });
    }
};

const getCart = async (req, res) => {
    // We expect the Clerk User ID from the headers (via middleware or direct)
    const { userId } = getAuth(req); 

    if (!userId) {
        return res.status(401).json({ success:false, message: "User ID is required to fetch the cart." });
    }

    try {
        const cartItems = await prisma.cartItem.findMany({
            where: {
                userId: userId
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        images: true,
                        category: true,
                        vendor: {
                            select: {
                                id: true,
                                businessName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formattedItems = cartItems.map((ci) => ({
            id: ci.product.id,
            name: ci.product.name,
            price: Number(ci.product.price),
            image: ci.product.images?.[0] || null,
            vendorId: ci.product.vendor.id,
            vendorName: ci.product.vendor.businessName,
            quantity: ci.quantity,
        }));

        // 💡 Pro Tip: Calculate the total cart price on the backend too!
        const cartTotal = formattedItems.reduce(
            (acc, item) => acc + item.price * item.quantity, 0
        );

        res.status(200).json({
            success:true,
            count: formattedItems.length,
            totalAmount: cartTotal,
            items: formattedItems,
        });
    } catch (error) {
        console.error("❌ Fetch Cart Error:", error);
        res.status(500).json({ success:false, message: "Failed to load your cart." });
    }
};

const updateCart = async (req, res) => {
  const { userId } = getAuth(req);
  const { productId, quantity } = req.body;

  try {
    // 1. If quantity dropped to 0 or below, delete the item
    if (quantity <= 0) {
        await prisma.cartItem.delete({
        where: {
            userId_productId: {
            userId: userId,
            productId: productId,
            },
        },
        });

        return res.status(200).json({ 
        success: true, 
        message: "Item removed from cart" 
        });
    }

    // 2. Otherwise update to the exact new quantity
    const updatedItem = await prisma.cartItem.update({
        where: {
        userId_productId: {
            userId: userId,
            productId: productId,
        },
        },
        data: {
        quantity: Number(quantity),
        },
    });

    return res.status(200).json({
        success: true,
        message: "Cart item updated successfully",
        data: updatedItem,
    });
    } catch (error) {
    console.error("❌ Cart Quantity Update Error:", error);

    // Prisma error P2025 indicates the record wasn't found to update/delete
    if (error.code === 'P2025') {
        return res.status(404).json({ error: "Item not found in cart" });
    }

    return res.status(500).json({ error: "Could not update cart quantity" });
    }
}



export { addToCart, removeFromCart, getCart, updateCart }