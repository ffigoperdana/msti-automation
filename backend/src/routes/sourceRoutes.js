import express from 'express';
import {
  getSources,
  getSource,
  createSource,
  updateSource,
  deleteSource,
  testSource,
  getSourceMetrics,
  executeSourceQuery
} from '../controllers/sourceController.js';
import { requireAuth, requireWrite } from '../middleware/authMiddleware.js';

const router = express.Router();

// Data Source routes
router.get('/', requireAuth, getSources);
router.post('/test', requireAuth, testSource);
router.get('/:id', requireAuth, getSource);
router.post('/', requireWrite, createSource);
router.put('/:id', requireWrite, updateSource);
router.delete('/:id', requireWrite, deleteSource);

// Metrics routes
router.get('/:id/metrics', requireAuth, getSourceMetrics);
router.post('/:id/query', requireAuth, executeSourceQuery);

export default router; 