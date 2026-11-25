import express from "express";
import { getPublicProducts, getVendorsWithProducts, getCategories } from "../controllers/productController.js";

const productRouter = express.Router();

productRouter.get("/search", getPublicProducts)
productRouter.get("/explore", getVendorsWithProducts)
productRouter.get('/categories', getCategories);


export default productRouter;