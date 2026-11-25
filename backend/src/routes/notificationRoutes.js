import express from 'express';
import { ensureDbUser } from '../middleware/ensureDbUser.js';
import { getUserNotifications, markNotificationsAsRead, updatePushToken } from '../controllers/notificationController.js';

const notificationRouter = express.Router();

notificationRouter.get('/', getUserNotifications)
notificationRouter.patch('/mark-read/:id', markNotificationsAsRead)
notificationRouter.patch('/push-token', ensureDbUser, updatePushToken)


export default notificationRouter