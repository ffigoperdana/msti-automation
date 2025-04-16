import express from 'express';
import { PrismaClient } from '@prisma/client';
import metricService from '../services/metricService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Buat variabel baru
router.post('/', async (req, res) => {
  const { name, label, type, query, options, current, dataSourceId, userId } = req.body;
  
  try {
    const variable = await prisma.variable.create({
      data: {
        name,
        label,
        type,
        query,
        options,
        current,
        dataSourceId,
        userId
      }
    });
    
    res.json(variable);
  } catch (error) {
    console.error('Error creating variable:', error);
    res.status(500).json({ error: "Failed to create variable" });
  }
});

// Ambil semua variabel untuk user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const variables = await prisma.variable.findMany({
      where: {
        userId
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(variables);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch variables" });
  }
});

// Update variabel
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, label, type, query, options, current, dataSourceId } = req.body;
  
  try {
    const updatedVariable = await prisma.variable.update({
      where: { id },
      data: {
        name,
        label,
        type,
        query,
        options,
        current,
        dataSourceId
      }
    });
    
    res.json(updatedVariable);
  } catch (error) {
    res.status(500).json({ error: "Failed to update variable" });
  }
});

// Hapus variabel
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.variable.delete({
      where: { id }
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