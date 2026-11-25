import express from 'express';
import { ensureDbUser } from '../middleware/ensureDbUser.js';
import { updateUserProfile, getUserProfile, getVendorDetails } from '../controllers/userController.js';

const userRouter = express.Router();

// PATCH is better than PUT here because we are doing a partial update
userRouter.patch('/update_profile', updateUserProfile);
userRouter.get('/profile', ensureDbUser, getUserProfile)
userRouter.get('/vendor/:id', getVendorDetails)
 
export default userRouter