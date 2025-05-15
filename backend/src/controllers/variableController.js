import express from 'express';
import { PrismaClient } from '@prisma/client';
import metricService from '../services/metricService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Validate variable query
router.post('/validate', async (req, res) => {
  try {
    const { query, type } = req.body;
    
    // Untuk tipe query, jalankan query untuk mendapatkan nilai
    if (type === 'query') {
      const result = await metricService.executeFluxQuery(null, query);
      const values = result.map(row => row.value || row._value).filter(Boolean);
      res.json({ values });
    } 
    // Untuk tipe custom dan constant, kembalikan nilai yang diberikan
    else if (type === 'custom' || type === 'constant') {
      res.json({ values: [query] });
    }
    // Untuk tipe textbox, kembalikan array kosong (akan diisi oleh user)
    else {
      res.json({ values: [] });
    }
  } catch (error) {
    console.error('Error validating variable:', error);
    res.status(500).json({ error: "Failed to validate variable" });
  }
});

// Get all variables
router.get('/', async (req, res) => {
  try {
    const variables = await prisma.dashboardVariable.findMany();
    res.json(variables);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch variables" });
  }
});

// Create new variable
router.post('/', async (req, res) => {
  try {
    const variable = await prisma.dashboardVariable.create({
      data: req.body
    });
    res.json(variable);
  } catch (error) {
    res.status(500).json({ error: "Failed to create variable" });
  }
});

// Update variable
router.put('/:id', async (req, res) => {
  try {
    const variable = await prisma.dashboardVariable.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(variable);
  } catch (error) {
    res.status(500).json({ error: "Failed to update variable" });
  }
});

// Delete variable
router.delete('/:id', async (req, res) => {
  try {
    await prisma.dashboardVariable.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete variable" });
  }
});

// Mendapatkan opsi nilai untuk variabel query
router.post('/query-options', async (req, res) => {
  const { dataSourceId, query, variables } = req.body;
  
  try {
    // Execute query dengan variabel yang ada
    const result = await metricService.executeFluxQuery(
      dataSourceId,
      query,
      variables
    );
    
    // Ekstrak nilai unik dari hasil query
    const options = extractUniqueValues(result);
    
    res.json(options);
  } catch (error) {
    console.error('Error fetching variable options:', error);
    res.status(500).json({ error: "Failed to fetch variable options" });
  }
});

// Execute query dengan substitusi variabel
router.post('/execute-query', async (req, res) => {
  const { dataSourceId, query, variables } = req.body;
  
  try {
    // Cari semua variabel dari database jika tidak disediakan
    let allVariables = variables;
    
    if (!allVariables && req.body.userId) {
      const dbVariables = await prisma.variable.findMany({
        where: {
          userId: req.body.userId
        }
      });
      
      allVariables = dbVariables.reduce((acc, v) => {
        acc[v.name] = v.current;
        return acc;
      }, {});
    }
    
    // Execute query dengan substitusi variabel
    const processedQuery = substituteVariables(query, allVariables);
    const result = await metricService.executeFluxQuery(
      dataSourceId,
      processedQuery,
      {
        timeRange: req.body.timeRange || {
          from: 'now-6h',
          to: 'now'
        },
        windowPeriod: req.body.windowPeriod || '10s'
      }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error executing query with variables:', error);
    res.status(500).json({ error: "Failed to execute query" });
  }
});

// Helper untuk mensubstitusi variabel dalam query
function substituteVariables(query, variables) {
  let processedQuery = query;
  
  for (const [name, value] of Object.entries(variables)) {
    processedQuery = processedQuery.replace(new RegExp(`\\$\\{${name}\\}`, 'g'), value);
  }
  
  return processedQuery;
}

// Helper untuk mengekstrak nilai unik dari hasil query
function extractUniqueValues(result) {
  if (!result || !result.series || result.series.length === 0) {
    return [];
  }
  
  const series = result.series[0];
  if (!series || !series.fields || series.fields.length < 2) {
    return [];
  }
  
  // Ambil field yang bukan 'Time'
  const valueField = series.fields.find(f => f.name !== 'Time');
  if (!valueField || !valueField.values) {
    return [];
  }
  
  // Extract unique values
  return [...new Set(valueField.values)].filter(v => v !== null && v !== undefined);
}

export default router; 