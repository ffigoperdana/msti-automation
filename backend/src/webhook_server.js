import express from 'express';
import automationService from './services/automationService.js';
import { createServer } from 'http';

const app = express();
let server;
let isShuttingDown = false;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('Webhook server shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`Webhook server received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        console.log('Webhook server HTTP server closed');
      });
    }
    
    console.log('Webhook server graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during webhook server graceful shutdown:', error);
    process.exit(1);
  }
};

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// Health check endpoint
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      service: 'webhook-server',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    status: 'healthy',
    service: 'webhook-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Endpoint untuk menerima webhook dari Grafana atau sistem alert lainnya
app.post('/webhook', async (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'service_unavailable',
      message: 'Server is shutting down'
    });
  }
  
  try {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));

    // Format data dari webhook ke format yang dibutuhkan automation service
    const alertData = {
      alertRule: {
        id: req.body.ruleId || req.body.ruleName || 'unknown',
        name: req.body.ruleName || req.body.alertname || 'Unknown Alert',
        threshold: req.body.evalMatches?.[0]?.value || req.body.value,
        comparison_operator: req.body.state === 'alerting' ? 'gt' : 'eq'
      },
      metricValue: req.body.evalMatches?.[0]?.value || req.body.value || 0,
      timestamp: new Date().toISOString(),
      source: req.body.source || 'webhook'
    };

    // Proses webhook menggunakan automation service
    const result = await automationService.handleWebhook(alertData);
    
    res.json({
      status: 'success',
      message: 'Webhook received and processed',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint untuk testing webhook
app.post('/webhook/test', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'service_unavailable',
      message: 'Server is shutting down'
    });
  }
  
  res.json({
    status: 'success',
    message: 'Webhook test endpoint received data',
    received_data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Webhook server error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start webhook server
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3002;

server = createServer(app);

server.listen(WEBHOOK_PORT, () => {
  console.log(`🔗 Webhook server running on port ${WEBHOOK_PORT}`);
  console.log(`🏥 Webhook health check: http://localhost:${WEBHOOK_PORT}/health`);
  console.log(`📬 Webhook endpoint: http://localhost:${WEBHOOK_PORT}/webhook`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Webhook server error:', error);
  gracefulShutdown('serverError');
});

export default server; 