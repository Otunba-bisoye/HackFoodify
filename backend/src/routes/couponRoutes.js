import express from 'express'
import { getMyCoupons, createCoupon } from '../controllers/couponController.js'
import { isAdmin } from '../middleware/authMiddleware.js'

const couponRouter = express.Router()

couponRouter.get('/my-coupons', getMyCoupons);
couponRouter.post('/create', createCoupon);

export default couponRouter;