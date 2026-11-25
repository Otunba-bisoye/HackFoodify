import express from 'express';
import { handleClerkWebhook, handleSquadWebhook } from '../controllers/webhookController.js';

const webhookRouter = express.Router();


webhookRouter.post('/clerk', handleClerkWebhook);
webhookRouter.post('/squad', handleSquadWebhook)

export default webhookRouter;