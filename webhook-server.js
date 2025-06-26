#!/usr/bin/env node

/**
 * MSTI Automation - Laptop Webhook Server
 * Receives deployment triggers from GitHub Actions
 * Automatically deploys to VPS via VPN connection
 */

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3333;
const SECRET_TOKEN = process.env.WEBHOOK_SECRET || 'msti-deploy-secret-2024';

// Middleware
app.use(express.json());

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.blue}[${timestamp}]${colors.reset} ${message}`);
};

const error = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.red}[ERROR ${timestamp}]${colors.reset} ${message}`);
};

const success = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.green}[SUCCESS ${timestamp}]${colors.reset} ${message}`);
};

// Deployment status tracking
let deploymentStatus = {
    isDeploying: false,
    lastDeployment: null,
    lastSuccess: null,
    deploymentHistory: []
};

// Load deployment history
const loadDeploymentHistory = () => {
    try {
        if (fs.existsSync('.deployment-history.json')) {
            deploymentStatus = JSON.parse(fs.readFileSync('.deployment-history.json', 'utf8'));
        }
    } catch (err) {
        error('Failed to load deployment history: ' + err.message);
    }
};

// Save deployment history
const saveDeploymentHistory = () => {
    try {
        fs.writeFileSync('.deployment-history.json', JSON.stringify(deploymentStatus, null, 2));
    } catch (err) {
        error('Failed to save deployment history: ' + err.message);
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        deploymentStatus: deploymentStatus.isDeploying ? 'deploying' : 'ready',
        lastDeployment: deploymentStatus.lastDeployment,
        lastSuccess: deploymentStatus.lastSuccess
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        ...deploymentStatus,
        webhook: {
            url: `http://localhost:${PORT}`,
            endpoints: {
                deploy: '/deploy',
                status: '/status',
                health: '/health',
                history: '/history'
            }
        }
    });
});

// Deployment history endpoint
app.get('/history', (req, res) => {
    res.json({
        history: deploymentStatus.deploymentHistory.slice(-10), // Last 10 deployments
        total: deploymentStatus.deploymentHistory.length
    });
});

// Main deployment webhook
app.post('/deploy', async (req, res) => {
    try {
        const { token, commit, branch, imageTag, timestamp } = req.body;
        
        // Verify secret token
        if (token !== SECRET_TOKEN) {
            error('Invalid webhook token received');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if already deploying
        if (deploymentStatus.isDeploying) {
            log('Deployment already in progress, skipping...');
            return res.json({ 
                status: 'skipped', 
                message: 'Deployment already in progress',
                currentDeployment: deploymentStatus.lastDeployment
            });
        }

        // Log deployment start
        log(`🚀 Deployment triggered from GitHub Actions`);
        log(`   Commit: ${commit}`);
        log(`   Branch: ${branch}`);
        log(`   Image Tag: ${imageTag}`);
        log(`   Timestamp: ${timestamp}`);

        // Update deployment status
        deploymentStatus.isDeploying = true;
        deploymentStatus.lastDeployment = {
            commit,
            branch,
            imageTag,
            timestamp: new Date().toISOString(),
            githubTimestamp: timestamp,
            status: 'deploying'
        };

        // Respond immediately to GitHub Actions
        res.json({ 
            status: 'accepted', 
            message: 'Deployment started',
            deploymentId: deploymentStatus.lastDeployment.timestamp
        });

        // Start deployment process (async)
        setTimeout(() => {
            runDeployment(imageTag, commit);
        }, 1000);

    } catch (err) {
        error('Webhook error: ' + err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Run deployment process
const runDeployment = async (imageTag, commit) => {
    try {
        log('Starting deployment process...');

        // Step 1: Git fetch to get latest tags
        log('📥 Fetching latest deployment tags...');
        await execCommand('git fetch --tags');

        // Step 2: Run deployment script
        log(`🚀 Deploying image tag: ${imageTag}`);
        const deployResult = await execCommand('./deploy-from-laptop.sh --auto', {
            env: { 
                ...process.env, 
                IMAGE_TAG: imageTag,
                AUTO_DEPLOY: 'true'
            }
        });

        // Step 3: Update deployment status
        deploymentStatus.isDeploying = false;
        deploymentStatus.lastDeployment.status = 'success';
        deploymentStatus.lastDeployment.completedAt = new Date().toISOString();
        deploymentStatus.lastDeployment.output = deployResult.substring(0, 1000); // Limit output
        deploymentStatus.lastSuccess = deploymentStatus.lastDeployment;

        // Add to history
        deploymentStatus.deploymentHistory.push({
            ...deploymentStatus.lastDeployment
        });

        // Keep only last 50 deployments
        if (deploymentStatus.deploymentHistory.length > 50) {
            deploymentStatus.deploymentHistory = deploymentStatus.deploymentHistory.slice(-50);
        }

        saveDeploymentHistory();
        success('✅ Deployment completed successfully!');

    } catch (err) {
        error('Deployment failed: ' + err.message);
        
        // Update failure status
        deploymentStatus.isDeploying = false;
        deploymentStatus.lastDeployment.status = 'failed';
        deploymentStatus.lastDeployment.completedAt = new Date().toISOString();
        deploymentStatus.lastDeployment.error = err.message;

        // Add to history
        deploymentStatus.deploymentHistory.push({
            ...deploymentStatus.lastDeployment
        });

        saveDeploymentHistory();
    }
};

// Execute command with promise
const execCommand = (command, options = {}) => {
    return new Promise((resolve, reject) => {
        log(`Executing: ${command}`);
        
        exec(command, options, (err, stdout, stderr) => {
            if (err) {
                error(`Command failed: ${err.message}`);
                if (stderr) error(`STDERR: ${stderr}`);
                reject(err);
            } else {
                if (stdout) log(`OUTPUT: ${stdout.trim()}`);
                resolve(stdout.trim());
            }
        });
    });
};

// Graceful shutdown
process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Start server
const startServer = () => {
    loadDeploymentHistory();
    
    app.listen(PORT, () => {
        success(`🎯 MSTI Webhook Server started!`);
        console.log('');
        console.log(`${colors.cyan}📍 Server Details:${colors.reset}`);
        console.log(`   URL: http://localhost:${PORT}`);
        console.log(`   Endpoints:`);
        console.log(`     POST /deploy   - Trigger deployment`);
        console.log(`     GET  /status   - Deployment status`);
        console.log(`     GET  /health   - Health check`);
        console.log(`     GET  /history  - Deployment history`);
        console.log('');
        console.log(`${colors.yellow}💡 Setup Instructions:${colors.reset}`);
        console.log(`   1. Expose this server using ngrok:`);
        console.log(`      ngrok http ${PORT}`);
        console.log(`   2. Add ngrok URL to GitHub Secrets:`);
        console.log(`      WEBHOOK_URL=https://xxxxx.ngrok.io`);
        console.log(`      WEBHOOK_SECRET=${SECRET_TOKEN}`);
        console.log(`   3. Push code to trigger deployment!`);
        console.log('');
        log('Waiting for deployment webhooks...');
    });
};

// Export for testing
module.exports = { app, startServer };

// Start server if run directly
if (require.main === module) {
    startServer();
} 