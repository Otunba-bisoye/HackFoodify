import express from "express";
import { getPendingVendors, getPendingChampions, updateVendorStatus, updateChampionStatus, toggleSuspension, removeVendor, deleteChampion, getAllVendors, getAllChampions, broadcastPromo } from "../controllers/adminController.js";

const adminRouter = express.Router()

adminRouter.get('/pending_vendors', getPendingVendors)
adminRouter.get('/pending_champions', getPendingChampions)
adminRouter.patch('/update_vend_status/:id', updateVendorStatus)
adminRouter.patch('/update_champ_status/:id', updateChampionStatus)
adminRouter.patch('/toggle_suspension/:id', toggleSuspension)
adminRouter.delete('/remove_vendor/:id', removeVendor)
adminRouter.delete('/delete_champion/:id', deleteChampion)
adminRouter.get('/all_vendors', getAllVendors)
adminRouter.get('/all_champions', getAllChampions)
adminRouter.post('/notifications/broadcast', broadcastPromo)


export default adminRouter