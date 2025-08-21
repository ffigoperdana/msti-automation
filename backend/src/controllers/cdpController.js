import express from 'express';
import cdpService from '../services/cdpService.js';

const router = express.Router();

router.post('/discover', async (req, res) => {
  try {
    const { name, seedIps, credentialGroups, options } = req.body || {};
    const result = await cdpService.startDiscovery({ name, seedIps, credentialGroups, options });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to start discovery' });
  }
});

router.get('/discoveries', async (_req, res) => {
  try {
    const items = await cdpService.listDiscoveries();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list discoveries' });
  }
});

router.get('/discoveries/:id', async (req, res) => {
  try {
    const item = await cdpService.getDiscovery(req.params.id);
    res.json(item);
  } catch (error) {
    res.status(404).json({ error: error.message || 'Not found' });
  }
});

router.get('/discoveries/:id/graph', async (req, res) => {
  try {
    const graph = await cdpService.getDiscoveryGraph(req.params.id);
    res.json(graph);
  } catch (error) {
    res.status(404).json({ error: error.message || 'Not found' });
  }
});

router.post('/discoveries/:id/save', async (req, res) => {
  try {
    const result = await cdpService.saveDiscovery(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to save discovery' });
  }
});

router.delete('/discoveries/:id', async (req, res) => {
  try {
    const result = await cdpService.deleteDiscovery(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to delete discovery' });
  }
});

// Update stored graph layout (positions etc.)
router.put('/discoveries/:id/graph', async (req, res) => {
  try {
    const { graph } = req.body || {};
    const result = await cdpService.updateDiscoveryGraph(req.params.id, graph);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update graph' });
  }
});

export default router;


