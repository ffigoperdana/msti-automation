import express from 'express';
import automationService from '../services/automationService.js';

const router = express.Router();

// Handle webhook dari alert
router.post('/webhook', async (req, res) => {
  try {
    const result = await automationService.handleWebhook(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to handle webhook" });
  }
});

// Buat automation rule baru
router.post('/rules', async (req, res) => {
  try {
    const automationRule = await automationService.createAutomationRule(req.body);
    res.json(automationRule);
  } catch (error) {
    res.status(500).json({ error: "Failed to create automation rule" });
  }
});

// Ambil semua automation rules
router.get('/rules', async (req, res) => {
  try {
    const rules = await automationService.getAutomationRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch automation rules" });
  }
});

// Ambil automation rule berdasarkan ID
router.get('/rules/:id', async (req, res) => {
  try {
    const rule = await automationService.getAutomationRules({ id: req.params.id });
    if (!rule) {
      return res.status(404).json({ error: "Automation rule not found" });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch automation rule" });
  }
});

export default router; 