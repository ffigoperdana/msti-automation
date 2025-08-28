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
  getPanel,
  updateDashboardLayout
} from '../controllers/visualizationController.js';

const router = express.Router();

// Data Source routes
router.get('/sources', getDataSources);
router.get('/sources/:id/metrics', getDataSourceMetrics);
router.post('/sources/:id/query', executeDataSourceQuery);

// Metrics route
router.get('/metrics', getMetrics);
router.get('/sources/metrics', getMetrics);

// Query routes
router.post('/query', executeVisualizationQuery);
router.post('/flux-query', executeFluxQuery);
router.post('/validate-query', validateQuery);
router.post('/validate-flux-query', validateFluxQuery);

// Dashboard routes
router.get('/dashboards', getDashboards);
router.get('/dashboards/:id', getDashboard);
router.post('/dashboards', createDashboard);
router.put('/dashboards/:id/layout', updateDashboardLayout);
router.put('/dashboards/:id', updateDashboard);
router.delete('/dashboards/:id', deleteDashboard); 

// Panel routes
router.get('/panels/:id', getPanel);
router.post('/dashboards/:dashboardId/panels', createPanel);
router.put('/panels/:id', updatePanel);
router.delete('/panels/:id', deletePanel);
router.post('/panels/:id/query', executePanelQuery);
router.post('/panels/:id/validate', validateQuery);

export default router;