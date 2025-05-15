// src/controllers/dataSourceController.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { InfluxDB } from '@influxdata/influxdb-client';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to ensure default user exists
async function ensureDefaultUser() {
  try {
    // Check if default user exists
    const defaultUser = await prisma.user.findUnique({
      where: { id: '1' }
    });
    
    // If not, create it
    if (!defaultUser) {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'admin@example.com',
          password_hash: 'password_hash_for_testing_only',
          role: 'admin'
        }
      });
      console.log('Created default user with ID 1');
    }
  } catch (error) {
    console.error('Error ensuring default user exists:', error);
  }
}

// Create a new data source
router.post('/', async (req, res) => {
  try {
    console.log('Received data source create request:', req.body);
    
    // Ensure default user exists
    await ensureDefaultUser();
    
    // Extract all fields from the request
    const { 
      userId, 
      name, 
      url, 
      type, 
      token, 
      username, 
      password, 
      database, 
      organization,
      measurement,
      isDefault 
    } = req.body;
    
    // Validate required fields
    if (!name || !url) {
      return res.status(400).json({ 
        error: "Name and URL are required fields" 
      });
    }
    
    // Create data source with all provided fields
    const dataSource = await prisma.dataSource.create({
      data: { 
        userId: userId || '1', // Default to user 1 if not provided
        name, 
        url, 
        type: type || 'influxdb',
        token, 
        username,
        password,
        database, 
        organization,
        measurement,
        isDefault: isDefault || false
      }
    });
    
    console.log('Created data source:', dataSource);
    res.status(201).json(dataSource);
  } catch (error) {
    console.error('Error creating data source:', error);
    res.status(500).json({ error: "Failed to create data source: " + error.message });
  }
});

// Get all data sources
router.get('/', async (req, res) => {
  try {
    const dataSources = await prisma.dataSource.findMany();
    res.json(dataSources);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data sources" });
  }
});

// Get data source by ID
router.get('/:id', async (req, res) => {
  try {
    console.log(`Get data source by ID: ${req.params.id}`);
    
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: req.params.id }
    });
    
    console.log(`Data source found:`, dataSource);
    
    if (!dataSource) {
      return res.status(404).json({ error: "Data source not found" });
    }
    
    res.json(dataSource);
  } catch (error) {
    console.error('Error fetching data source:', error);
    res.status(500).json({ error: "Failed to fetch data source" });
  }
});

// Test connection to InfluxDB
router.post('/test-connection', async (req, res) => {
  try {
    const { url, token, database } = req.body;
    
    const influxDB = new InfluxDB({
      url,
      token
    });
    
    // Test API call to check connection
    const queryApi = influxDB.getQueryApi(database);
    const testQuery = 'buckets()';
    
    const result = await executeQuery(queryApi, testQuery);
    
    res.json({
      status: 'success',
      message: 'Connection successful',
      buckets: result
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      status: 'error',
      message: `Connection failed: ${error.message}`
    });
  }
});

// Get available buckets (measurements) from InfluxDB
router.post('/buckets', async (req, res) => {
  try {
    const { url, token, database } = req.body;
    
    const influxDB = new InfluxDB({
      url,
      token
    });
    
    const queryApi = influxDB.getQueryApi(database);
    const bucketsQuery = 'buckets()';
    
    const buckets = await executeQuery(queryApi, bucketsQuery);
    
    res.json({
      status: 'success',
      buckets
    });
  } catch (error) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to fetch buckets: ${error.message}`
    });
  }
});

// Get available measurements for a bucket
router.post('/measurements', async (req, res) => {
  try {
    const { url, token, database, bucket } = req.body;
    
    const influxDB = new InfluxDB({
      url,
      token
    });
    
    const queryApi = influxDB.getQueryApi(database);
    const measurementsQuery = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${bucket}")
    `;
    
    const measurements = await executeQuery(queryApi, measurementsQuery);
    
    res.json({
      status: 'success',
      measurements
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to fetch measurements: ${error.message}`
    });
  }
});

// Update data source
router.put('/:id', async (req, res) => {
  try {
    console.log(`Update data source with ID: ${req.params.id}`);
    console.log('Update data:', req.body);
    
    const { 
      name, 
      url, 
      type, 
      token, 
      username, 
      password, 
      database, 
      organization,
      measurement,
      isDefault 
    } = req.body;
    
    // Cari terlebih dahulu untuk memastikan data ada
    const existingDataSource = await prisma.dataSource.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingDataSource) {
      return res.status(404).json({ error: "Data source not found" });
    }
    
    // Update data
    const updatedDataSource = await prisma.dataSource.update({
      where: { id: req.params.id },
      data: { 
        name, 
        url, 
        type: type || existingDataSource.type,
        token, 
        username,
        password,
        database, 
        organization,
        measurement,
        isDefault: isDefault !== undefined ? isDefault : existingDataSource.isDefault,
      }
    });
    
    console.log('Updated data source:', updatedDataSource);
    res.json(updatedDataSource);
  } catch (error) {
    console.error('Error updating data source:', error);
    res.status(500).json({ error: "Failed to update data source: " + error.message });
  }
});

// Get metrics for a data source
router.get('/:id/metrics', async (req, res) => {
  try {
    console.log(`Get metrics for data source ID: ${req.params.id}`);
    
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: req.params.id }
    });
    
    if (!dataSource) {
      return res.status(404).json({ error: "Data source not found" });
    }

    const influxDB = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = influxDB.getQueryApi(dataSource.organization);
    const metricsQuery = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${dataSource.database}")
    `;
    
    console.log('Executing query:', metricsQuery);
    const metrics = await executeQuery(queryApi, metricsQuery);
    
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to fetch metrics: ${error.message}`
    });
  }
});

// Delete data source
router.delete('/:id', async (req, res) => {
  try {
    console.log(`Delete data source with ID: ${req.params.id}`);
    
    // Cari terlebih dahulu untuk memastikan data ada
    const existingDataSource = await prisma.dataSource.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingDataSource) {
      return res.status(404).json({ error: "Data source not found" });
    }
    
    // Delete data source
    await prisma.dataSource.delete({
      where: { id: req.params.id }
    });
    
    console.log('Data source deleted successfully');
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting data source:', error);
    res.status(500).json({ error: "Failed to delete data source: " + error.message });
  }
});

// Helper function to execute queries
async function executeQuery(queryApi, query) {
  return new Promise((resolve, reject) => {
    const data = [];
    
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        data.push(o);
      },
      error(error) {
        reject(error);
      },
      complete() {
        resolve(data);
      },
    });
  });
}

export default router;
