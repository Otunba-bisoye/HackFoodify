import express from 'express';
import multer from 'multer'
import { applyToBeVendor, createProduct, deleteProduct, getMyProducts, toggleVendorAcceptingOrders, getVendorProfile, getVendorMetrics, fetchOrders, getVendorOrderDetail, updateProduct, getProductDetails, getCategories, addBankDetails, getVendorTransactions } from '../controllers/vendorController.js'
import { isProductOwnerOrAdmin } from '../middleware/authMiddleware.js';

const vendorRouter = express.Router();

const upload = multer({ dest: 'uploads/' })


vendorRouter.post('/apply', upload.single('image'), applyToBeVendor)
vendorRouter.post('/create_product', upload.single('image'), createProduct)
vendorRouter.get('/profile', getVendorProfile)
vendorRouter.get('/metrics', getVendorMetrics)
vendorRouter.get('/orders', fetchOrders);
vendorRouter.get('/order/:id', getVendorOrderDetail)
vendorRouter.delete("/delete_product/:id", isProductOwnerOrAdmin, deleteProduct)
vendorRouter.patch('/update_product/:id', isProductOwnerOrAdmin, updateProduct)
vendorRouter.get("/my_products", getMyProducts)
vendorRouter.get('/product/:id', getProductDetails)
vendorRouter.get('/product_categories', getCategories)
vendorRouter.get('/transactions', getVendorTransactions)
vendorRouter.patch('/bank-details', addBankDetails)
vendorRouter.patch('/toggle_accepting_orders', toggleVendorAcceptingOrders)


export default vendorRouter;