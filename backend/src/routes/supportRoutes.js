import express from 'express';
import {
  getSupportMessages,
  sendSupportMessage,
  getUnreadSupportCount,
} from '../controllers/supportController.js';

const supportRouter = express.Router();

supportRouter.get('/messages', getSupportMessages);
supportRouter.post('/messages', sendSupportMessage);
supportRouter.get('/unread-count', getUnreadSupportCount);

export default supportRouter;