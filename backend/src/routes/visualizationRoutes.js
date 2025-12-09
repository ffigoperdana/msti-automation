import express from 'express';
import {
  executeFluxQuery,
  executeVisualizationQuery,
  getDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  createPanel,
  updatePanel,
  deletePanel,
  executePanelQuery,
  getMetrics,
  validateQuery,
  validateFluxQuery,
  getDataSources,
  getDataSourceMetrics,
  executeDataSourceQuery,
  getPanel
} from '../controllers/visualizationController.js';
import { requireAuth, requireWrite } from '../middleware/authMiddleware.js';

const router = express.Router();

// Data Source routes
router.get('/sources', requireAuth, getDataSources);
router.get('/sources/:id/metrics', requireAuth, getDataSourceMetrics);
router.post('/sources/:id/query', requireAuth, executeDataSourceQuery);

// Metrics route
router.get('/metrics', requireAuth, getMetrics);
router.get('/sources/metrics', requireAuth, getMetrics);

// Query routes
router.post('/query', requireAuth, executeVisualizationQuery);
router.post('/flux-query', requireAuth, executeFluxQuery);
router.post('/validate-query', requireAuth, validateQuery);
router.post('/validate-flux-query', requireAuth, validateFluxQuery);

// Dashboard routes
router.get('/dashboards', requireAuth, getDashboards);
router.get('/dashboards/:id', requireAuth, getDashboard);
router.post('/dashboards', requireWrite, createDashboard);
router.put('/dashboards/:id', requireWrite, updateDashboard);
router.delete('/dashboards/:id', requireWrite, deleteDashboard);

// Panel routes
router.get('/panels/:id', requireAuth, getPanel);
router.post('/dashboards/:dashboardId/panels', requireWrite, createPanel);
router.put('/panels/:id', requireWrite, updatePanel);
router.delete('/panels/:id', requireWrite, deletePanel);
router.post('/panels/:id/query', requireAuth, executePanelQuery);
router.post('/panels/:id/validate', requireAuth, validateQuery);

export default router;