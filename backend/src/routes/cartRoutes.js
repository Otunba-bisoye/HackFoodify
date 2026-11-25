import express from 'express';
import { getCart, addToCart, removeFromCart, updateCart } from '../controllers/cartController.js';

const cartRouter = express.Router();

// GET /api/cart -> Fetch the current user's cart (Name, Price, Vendor)
cartRouter.get('/', getCart);

// POST /api/cart/add -> Upsert a product into the cart (Increment quantity)
cartRouter.post('/add', addToCart);

// DELETE /api/cart/:productId -> Remove a specific item from the cart
cartRouter.delete('/remove/:productId', removeFromCart);

cartRouter.patch('/update', updateCart)

export default cartRouter;