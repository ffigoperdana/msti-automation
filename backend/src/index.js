// src/index.js

import express from 'express';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger/swagger.json' with { type: "json" }; // Swagger file for documentation
import websocketService from './services/websocketService.js';
import app from './app.js';

const prisma = new PrismaClient();
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
  res.send('MSTI Backend Server is running');
});

// Initialize WebSocket
websocketService.initialize(server);

const PORT = process.env.PORT || 3001;

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Print available routes
  console.log('\nAvailable Routes:');
  console.log('GET     /');
  console.log('GET     /api-docs');
  console.log('*       /api/sources/*');
  console.log('*       /api/visualizations/*');
});
