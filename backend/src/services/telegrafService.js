import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const TELEGRAF_CONFIG_DIR = process.env.TELEGRAF_CONFIG_DIR || '/telegraf-configs';
const TELEGRAF_BINARY = process.env.TELEGRAF_BINARY || '/usr/bin/telegraf';
const SSH_USER = process.env.SSH_USER || 'cisco';
const SSH_HOST = process.env.SSH_HOST || 'localhost';
const SSH_PASSWORD = process.env.SSH_PASSWORD || 'cisco123';

/**
 * Scan telegraf configuration directory
 * @returns {Promise<Array>} List of config files with metadata
 */
export const scanTelegrafConfigs = async () => {
  try {
    // Check if directory exists
    try {
      await fs.access(TELEGRAF_CONFIG_DIR);
    } catch (error) {
      console.warn(`Telegraf config directory not found: ${TELEGRAF_CONFIG_DIR}`);
      return [];
    }

    const files = await fs.readdir(TELEGRAF_CONFIG_DIR);
    
    const configs = await Promise.all(
      files
        .filter(file => file.endsWith('.conf') || file.endsWith('.conf.disabled'))
        .map(async (filename) => {
          const filePath = path.join(TELEGRAF_CONFIG_DIR, filename);
          const stats = await fs.stat(filePath);
          
          // Determine if config is enabled
          const isEnabled = !filename.endsWith('.disabled');
          const baseName = filename.replace('.disabled', '');
          
          return {
            filename,
            baseName,
            enabled: isEnabled,
            size: stats.size,
            modified: stats.mtime,
            path: filePath
          };
        })
    );
    
    return configs.sort((a, b) => a.baseName.localeCompare(b.baseName));
  } catch (error) {
    console.error('Error scanning telegraf configs:', error);
    throw new Error(`Failed to scan telegraf configs: ${error.message}`);
  }
};

/**
 * Read a specific telegraf config file
 * @param {string} filename - Name of the config file
 * @returns {Promise<Object>} Config file content and metadata
 */
export const readConfig = async (filename) => {
  try {
    const filePath = path.join(TELEGRAF_CONFIG_DIR, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    const isEnabled = !filename.endsWith('.disabled');
    const baseName = filename.replace('.disabled', '');
    
    return {
      filename,
      baseName,
      content,
      enabled: isEnabled,
      size: stats.size,
      modified: stats.mtime,
      path: filePath
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Config file not found: ${filename}`);
    }
    console.error('Error reading config:', error);
    throw new Error(`Failed to read config: ${error.message}`);
  }
};

/**
 * Write/update a telegraf config file
 * @param {string} filename - Name of the config file
 * @param {string} content - Config file content
 * @param {boolean} enabled - Whether config is enabled
 * @returns {Promise<Object>} Result of write operation
 */
export const writeConfig = async (filename, content, enabled = true) => {
  try {
    // Ensure filename has .conf extension
    let finalFilename = filename;
    if (!finalFilename.endsWith('.conf') && !finalFilename.endsWith('.conf.disabled')) {
      finalFilename = `${finalFilename}.conf`;
    }
    
    // Add .disabled suffix if not enabled
    if (!enabled && !finalFilename.endsWith('.disabled')) {
      finalFilename = `${finalFilename}.disabled`;
    } else if (enabled && finalFilename.endsWith('.disabled')) {
      finalFilename = finalFilename.replace('.disabled', '');
    }
    
    const filePath = path.join(TELEGRAF_CONFIG_DIR, finalFilename);
    
    // Write content to file
    await fs.writeFile(filePath, content, 'utf-8');
    
    // Set proper permissions (644)
    await fs.chmod(filePath, 0o644);
    
    return {
      success: true,
      filename: finalFilename,
      path: filePath,
      message: 'Config file saved successfully'
    };
  } catch (error) {
    console.error('Error writing config:', error);
    throw new Error(`Failed to write config: ${error.message}`);
  }
};

/**
 * Delete a telegraf config file
 * @param {string} filename - Name of the config file to delete
 * @returns {Promise<Object>} Result of delete operation
 */
export const deleteConfig = async (filename) => {
  try {
    const filePath = path.join(TELEGRAF_CONFIG_DIR, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Delete file
    await fs.unlink(filePath);
    
    return {
      success: true,
      filename,
      message: 'Config file deleted successfully'
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Config file not found: ${filename}`);
    }
    console.error('Error deleting config:', error);
    throw new Error(`Failed to delete config: ${error.message}`);
  }
};

/**
 * Toggle config enabled/disabled state
 * @param {string} filename - Current filename
 * @param {boolean} enabled - Target enabled state
 * @returns {Promise<Object>} Result of toggle operation
 */
export const toggleConfig = async (filename, enabled) => {
  try {
    const oldPath = path.join(TELEGRAF_CONFIG_DIR, filename);
    
    // Check if file exists
    await fs.access(oldPath);
    
    // Determine new filename
    let newFilename;
    if (enabled && filename.endsWith('.disabled')) {
      newFilename = filename.replace('.disabled', '');
    } else if (!enabled && !filename.endsWith('.disabled')) {
      newFilename = `${filename}.disabled`;
    } else {
      // Already in desired state
      return {
        success: true,
        filename,
        message: 'Config already in desired state'
      };
    }
    
    const newPath = path.join(TELEGRAF_CONFIG_DIR, newFilename);
    
    // Rename file
    await fs.rename(oldPath, newPath);
    
    return {
      success: true,
      oldFilename: filename,
      newFilename,
      enabled,
      message: `Config ${enabled ? 'enabled' : 'disabled'} successfully`
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Config file not found: ${filename}`);
    }
    console.error('Error toggling config:', error);
    throw new Error(`Failed to toggle config: ${error.message}`);
  }
};

/**
 * Validate telegraf config using --test flag
 * @param {string} filename - Name of config file to validate (optional, validates all if not provided)
 * @returns {Promise<Object>} Validation result
 */
export const validateConfig = async (filename = null) => {
  try {
    let command;
    
    if (filename) {
      const filePath = path.join(TELEGRAF_CONFIG_DIR, filename);
      // Validate specific config file
      command = `sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "sudo ${TELEGRAF_BINARY} --config ${filePath} --test 2>&1"`;
    } else {
      // Validate all configs
      command = `sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "sudo ${TELEGRAF_BINARY} --config /etc/telegraf/telegraf.conf --config-directory /etc/telegraf/telegraf.d --test 2>&1"`;
    }
    
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    const output = stdout + stderr;
    
    // Check if validation passed (telegraf returns 0 on success)
    const isValid = !output.toLowerCase().includes('error');
    
    return {
      valid: isValid,
      output: output.trim(),
      message: isValid ? 'Configuration is valid' : 'Configuration has errors'
    };
  } catch (error) {
    // If command exits with non-zero, it means validation failed
    const output = error.stdout || error.stderr || error.message;
    
    return {
      valid: false,
      output: output.trim(),
      message: 'Configuration validation failed',
      error: error.message
    };
  }
};

/**
 * Restart telegraf service via SSH
 * @returns {Promise<Object>} Result of restart operation
 */
export const restartTelegraf = async () => {
  try {
    const command = `sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "sudo systemctl restart telegraf"`;
    
    await execAsync(command, { timeout: 10000 });
    
    // Wait a moment for service to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Telegraf service restarted successfully'
    };
  } catch (error) {
    console.error('Error restarting telegraf:', error);
    throw new Error(`Failed to restart telegraf: ${error.message}`);
  }
};

/**
 * Get telegraf service status via SSH
 * @returns {Promise<Object>} Service status information
 */
export const getTelegrafStatus = async () => {
  try {
    const command = `sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "sudo systemctl status telegraf"`;
    
    const { stdout } = await execAsync(command, { timeout: 10000 });
    
    const isActive = stdout.includes('active (running)');
    const isEnabled = stdout.includes('enabled');
    
    return {
      active: isActive,
      enabled: isEnabled,
      status: isActive ? 'running' : 'stopped',
      output: stdout.trim()
    };
  } catch (error) {
    // Service might be stopped, which causes non-zero exit
    const output = error.stdout || '';
    const isActive = output.includes('active (running)');
    
    return {
      active: isActive,
      enabled: false,
      status: isActive ? 'running' : 'stopped',
      output: output.trim() || error.message
    };
  }
};
