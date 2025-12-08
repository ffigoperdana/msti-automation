import express from 'express';
import * as telegrafController from '../controllers/telegrafController.js';

const router = express.Router();

// List all telegraf configs
router.get('/configs', telegrafController.listConfigs);

// Get specific config
router.get('/configs/:filename', telegrafController.getConfig);

// Create new config
router.post('/configs', telegrafController.createConfig);

// Update existing config
router.put('/configs/:filename', telegrafController.updateConfig);

// Delete config
router.delete('/configs/:filename', telegrafController.deleteConfig);

// Toggle config enabled/disabled state
router.patch('/configs/:filename/toggle', telegrafController.toggleConfigState);

// Validate configuration
router.post('/validate', telegrafController.validateConfiguration);

// Restart telegraf service
router.post('/restart', telegrafController.restartService);

// Get telegraf service status
router.get('/status', telegrafController.getServiceStatus);

// Rescan config directory
router.post('/scan', telegrafController.rescanConfigs);

export default router;
