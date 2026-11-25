import express from 'express';
import multer from 'multer';
import { applyToBeChampion, toggleChampionStatus, getChampionActiveTask, getChampionStats, getAvailableOrders, claimOrder, completeOrder } from '../controllers/championController.js'

const championRouter = express.Router();
const upload = multer({ dest: 'uploads/' })


championRouter.post('/apply', upload.array('files', 5), applyToBeChampion)
championRouter.get('/available_orders', getAvailableOrders)
championRouter.patch('/claim_order/:orderId', claimOrder)
championRouter.patch('/toggle_status', toggleChampionStatus);


championRouter.get('/stats', getChampionStats);


// --- ACTIVE DELIVERY LOGISTICS ---



// The "Focus Mode" - get details for the current active delivery
championRouter.get('/active-task', getChampionActiveTask);

// The "Delivered" button - marks finished and resets availability
championRouter.patch('/complete/:orderId', completeOrder);

export default championRouter;