import express from 'express';
import { resolveAccount } from '../controllers/bankController.js';

const bankRouter =express.Router();

bankRouter.post("/resolve", resolveAccount);

export default bankRouter

