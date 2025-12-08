import express from 'express';
import * as flowAnalyticController from '../controllers/flowAnalyticController.js';

const router = express.Router();

// Create a new flow analytic
router.post('/', flowAnalyticController.createFlowAnalytic);

// Get all flow analytics
router.get('/', flowAnalyticController.getFlowAnalytics);

// Get a specific flow analytic by ID
router.get('/:id', flowAnalyticController.getFlowAnalyticById);

// Execute flow queries (without saving)
router.post('/execute', flowAnalyticController.executeFlowAnalytic);

// Update a flow analytic
router.put('/:id', flowAnalyticController.updateFlowAnalytic);

// Delete a flow analytic
router.delete('/:id', flowAnalyticController.deleteFlowAnalytic);

export default router;
