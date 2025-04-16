// src/controllers/visualizationController.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import metricService from '../services/metricService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Execute raw Flux query
router.post('/flux-query', async (req, res) => {
  try {
    const { dataSourceId, query, variables } = req.body;
    const result = await metricService.executeFluxQuery(dataSourceId, query, variables);
    res.json(result);
  } catch (error) {
    console.error('Error executing Flux query:', error);
    res.status(500).json({ error: "Failed to execute Flux query" });
  }
});

// Execute query untuk visualisasi
router.post('/query', async (req, res) => {
  try {
    const { dataSourceId, queryConfig } = req.body;
    const result = await metricService.executeQuery(dataSourceId, queryConfig);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to execute query" });
  }
});

// Buat visualisasi baru
router.post('/', async (req, res) => {
  try {
    const visualization = await metricService.saveVisualization(req.body);
    res.json(visualization);
  } catch (error) {
    res.status(500).json({ error: "Failed to create visualization" });
  }
});

// Ambil visualisasi dengan data terbaru
router.get('/:id', async (req, res) => {
  try {
    const visualization = await metricService.getVisualization(req.params.id);
    res.json(visualization);
  } catch (error) {
    if (error.message === 'Visualization not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to fetch visualization" });
    }
  }
});

// Update visualisasi
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedVisualization = await prisma.visualization.update({
      where: { id },
      data: {
        name: req.body.name,
        type: req.body.type,
        config: req.body.config,
        queryConfig: req.body.queryConfig
      }
    });
    res.json(updatedVisualization);
  } catch (error) {
    res.status(500).json({ error: "Failed to update visualization" });
  }
});

// Hapus visualisasi
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.visualization.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete visualization" });
  }
});

export default router;
