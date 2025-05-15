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

const router = express.Router();

// Data Source routes
router.get('/', getSources);
router.post('/test', testSource);
router.get('/:id', getSource);
router.post('/', createSource);
router.put('/:id', updateSource);
router.delete('/:id', deleteSource);

// Metrics routes
router.get('/:id/metrics', getSourceMetrics);
router.post('/:id/query', executeSourceQuery);

export default router; 