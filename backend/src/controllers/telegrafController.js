import * as telegrafService from '../services/telegrafService.js';

/**
 * Get list of all telegraf configs
 * GET /api/telegraf/configs
 */
export const listConfigs = async (req, res) => {
  try {
    const configs = await telegrafService.scanTelegrafConfigs();
    
    res.json({
      success: true,
      count: configs.length,
      configs
    });
  } catch (error) {
    console.error('Error listing configs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a specific telegraf config
 * GET /api/telegraf/configs/:filename
 */
export const getConfig = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const config = await telegrafService.readConfig(filename);
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create a new telegraf config
 * POST /api/telegraf/configs
 * Body: { filename, content, enabled, validate }
 */
export const createConfig = async (req, res) => {
  try {
    const { filename, content, enabled = true, validate = true } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Config content is required'
      });
    }
    
    // First, write the config to a temporary file
    const tempFilename = `${filename}.tmp`;
    await telegrafService.writeConfig(tempFilename, content, false);
    
    // Validate if requested
    if (validate) {
      const validation = await telegrafService.validateConfig(tempFilename);
      
      if (!validation.valid) {
        // Delete temp file
        await telegrafService.deleteConfig(tempFilename);
        
        return res.status(400).json({
          success: false,
          message: 'Configuration validation failed',
          validation
        });
      }
      
      // Delete temp file after validation
      await telegrafService.deleteConfig(tempFilename);
    }
    
    // Write the actual config file
    const result = await telegrafService.writeConfig(filename, content, enabled);
    
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error creating config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update an existing telegraf config
 * PUT /api/telegraf/configs/:filename
 * Body: { content, enabled, validate }
 */
export const updateConfig = async (req, res) => {
  try {
    const { filename } = req.params;
    const { content, enabled, validate = true } = req.body;
    
    // Check if file exists
    await telegrafService.readConfig(filename);
    
    if (content === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Config content is required'
      });
    }
    
    // Validate if content is being updated and validation is requested
    if (validate) {
      // Write to temp file for validation
      const tempFilename = `${filename}.tmp`;
      await telegrafService.writeConfig(tempFilename, content, false);
      
      const validation = await telegrafService.validateConfig(tempFilename);
      
      // Delete temp file
      await telegrafService.deleteConfig(tempFilename);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Configuration validation failed',
          validation
        });
      }
    }
    
    // Determine the base filename (without .disabled)
    const baseFilename = filename.replace('.disabled', '');
    
    // Write the updated config
    const finalEnabled = enabled !== undefined ? enabled : !filename.endsWith('.disabled');
    const result = await telegrafService.writeConfig(baseFilename, content, finalEnabled);
    
    // If filename changed due to enabled state, delete old file
    if (result.filename !== filename) {
      try {
        await telegrafService.deleteConfig(filename);
      } catch (err) {
        console.warn('Could not delete old file:', err.message);
      }
    }
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a telegraf config
 * DELETE /api/telegraf/configs/:filename
 */
export const deleteConfig = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const result = await telegrafService.deleteConfig(filename);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Toggle config enabled/disabled
 * PATCH /api/telegraf/configs/:filename/toggle
 * Body: { enabled }
 */
export const toggleConfigState = async (req, res) => {
  try {
    const { filename } = req.params;
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Enabled state is required'
      });
    }
    
    const result = await telegrafService.toggleConfig(filename, enabled);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error toggling config:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Validate telegraf configuration
 * POST /api/telegraf/validate
 * Body: { filename } (optional - validates all if not provided)
 */
export const validateConfiguration = async (req, res) => {
  try {
    const { filename } = req.body;
    
    const result = await telegrafService.validateConfig(filename);
    
    res.json({
      success: result.valid,
      ...result
    });
  } catch (error) {
    console.error('Error validating config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Restart telegraf service
 * POST /api/telegraf/restart
 */
export const restartService = async (req, res) => {
  try {
    const result = await telegrafService.restartTelegraf();
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error restarting telegraf:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get telegraf service status
 * GET /api/telegraf/status
 */
export const getServiceStatus = async (req, res) => {
  try {
    const status = await telegrafService.getTelegrafStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error getting telegraf status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Rescan telegraf config directory
 * POST /api/telegraf/scan
 */
export const rescanConfigs = async (req, res) => {
  try {
    const configs = await telegrafService.scanTelegrafConfigs();
    
    res.json({
      success: true,
      count: configs.length,
      configs,
      message: 'Directory scanned successfully'
    });
  } catch (error) {
    console.error('Error rescanning configs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
