// src/index.js

import express from 'express';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger/swagger.json' assert { type: "json" }; // Swagger file for documentation
import websocketService from './services/websocketService.js';

const prisma = new PrismaClient();
const app = express();
const server = createServer(app);

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Dalam produksi, ganti dengan domain frontend yang sebenarnya
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware for JSON requests
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Home route
app.get('/', (req, res) => {
  res.send('TIG Backend Server is running');
});

// Define Routes (Controllers)
import userRoutes from './controllers/userController.js';
import dataSourceRoutes from './controllers/dataSourceController.js';
import alertRuleRoutes from './controllers/alertRuleController.js';
import ansibleConfigRoutes from './controllers/ansibleConfigController.js';
import ansiblePlaybookRoutes from './controllers/ansiblePlaybookController.js';
import visualizationRoutes from './controllers/visualizationController.js';
import automationRoutes from './controllers/automationController.js';
import variableRoutes from './controllers/variableController.js';

app.use('/api/users', userRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/alert-rules', alertRuleRoutes);
app.use('/api/ansible-configs', ansibleConfigRoutes);
app.use('/api/ansible-playbooks', ansiblePlaybookRoutes);
app.use('/api/visualizations', visualizationRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/variables', variableRoutes);

// Initialize WebSocket
websocketService.initialize(server);

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
