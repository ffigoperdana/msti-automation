// src/controllers/dataSourceController.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { InfluxDB } from '@influxdata/influxdb-client';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new data source
router.post('/', async (req, res) => {
  const { userId, name, url, token, database, measurement } = req.body;
  try {
    const dataSource = await prisma.dataSource.create({
      data: { userId, name, url, token, database, measurement }
    });
    res.json(dataSource);
  } catch (error) {
    res.status(500).json({ error: "Failed to create data source" });
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
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: req.params.id }
    });
    if (!dataSource) {
      return res.status(404).json({ error: "Data source not found" });
    }
    res.json(dataSource);
  } catch (error) {
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

// Helper function to execute queries
async function executeQuery(queryApi, query) {
  return new Promise((resolve, reject) => {
    const data = [];
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const result = tableMeta.toObject(row);
        data.push(result);
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
