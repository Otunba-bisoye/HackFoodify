import express from 'express';
import { resolveAddress, searchAutocomplete, recordRiderPing } from '../controllers/landMarkController.js'

const landMarkRouter = express.Router()

landMarkRouter.post('/resolve', resolveAddress)
landMarkRouter.get('/search', searchAutocomplete)
landMarkRouter.patch('/ping', recordRiderPing)

export default landMarkRouter