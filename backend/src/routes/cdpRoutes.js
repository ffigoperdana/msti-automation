import express from 'express';
import cdpController from '../controllers/cdpController.js';

const router = express.Router();

// Mount controller routes under /api/cdp
router.use('/', cdpController);

export default router;


