import express from 'express';
const orderRouter = express.Router();
import { checkout, getCheckoutPreview, getVendorOrderHistory, getUserOrderHistory, updateOrderStatus, getOrderTracking, getUserOrders, getOrderById, retryPayment, handlePaymentCallback,verifyPayment } from '../controllers/orderController.js';

// --- CUSTOMER ROUTES ---
// Place a new order
orderRouter.post('/checkout', checkout); 

orderRouter.post('/preview', getCheckoutPreview);

orderRouter.post('/retry_payment', retryPayment); 

orderRouter.get('/callback', handlePaymentCallback);

orderRouter.get('/payment/verify/:reference', verifyPayment);


orderRouter.get('/', getUserOrders);

orderRouter.get('/:id', getOrderById);
// View personal order history & active orders
orderRouter.get('/filtered_orders', getUserOrderHistory); 
// USPS-style tracking (Public or Customer)
orderRouter.get('/tracking/:orderId', getOrderTracking);


// --- VENDOR ROUTES --- 

orderRouter.get('/vendor/order_history', getVendorOrderHistory); 

orderRouter.patch('/update_status/:id', updateOrderStatus); 

export default orderRouter;