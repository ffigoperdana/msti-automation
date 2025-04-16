import express from 'express';
import automationService from './services/automationService.js';

const app = express();
app.use(express.json());

// Endpoint untuk menerima webhook dari Grafana
app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook from Grafana:', req.body);

    // Format data dari Grafana Alert ke format yang dibutuhkan
    const alertData = {
      alertRule: {
        id: req.body.ruleId,
        name: req.body.ruleName,
        threshold: req.body.evalMatches?.[0]?.value,
        comparison_operator: 'gt' // Default operator, sesuaikan dengan kebutuhan
      },
      metricValue: req.body.evalMatches?.[0]?.value,
      timestamp: new Date().toISOString()
    };

    // Proses webhook menggunakan automation service
    const result = await automationService.handleWebhook(alertData);
    
    res.json({
      status: 'success',
      message: 'Webhook received and processed',
      result
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Endpoint untuk health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const port = process.env.WEBHOOK_PORT || 3001;
app.listen(port, () => {
  console.log(`Webhook server is running on port ${port}`);
}); 