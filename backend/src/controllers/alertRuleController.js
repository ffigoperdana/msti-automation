// src/controllers/alertRuleController.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new alert rule
router.post('/', async (req, res) => {
  const { userId, queryId, threshold, comparison_operator, alertContactPointId, enabled } = req.body;
  try {
    const alertRule = await prisma.alertRule.create({
      data: { userId, queryId, threshold, comparison_operator, alertContactPointId, enabled }
    });
    res.json(alertRule);
  } catch (error) {
    res.status(500).json({ error: "Failed to create alert rule" });
  }
});

// Get all alert rules
router.get('/', async (req, res) => {
  try {
    const alertRules = await prisma.alertRule.findMany();
    res.json(alertRules);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alert rules" });
  }
});

export default router;
