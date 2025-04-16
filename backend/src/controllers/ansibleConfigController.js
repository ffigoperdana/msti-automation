// src/controllers/ansibleConfigController.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new Ansible config
router.post('/', async (req, res) => {
  const { userId, name, config_file } = req.body;
  try {
    const ansibleConfig = await prisma.ansibleConfig.create({
      data: { userId, name, config_file }
    });
    res.json(ansibleConfig);
  } catch (error) {
    res.status(500).json({ error: "Failed to create Ansible config" });
  }
});

// Get all Ansible configs
router.get('/', async (req, res) => {
  try {
    const ansibleConfigs = await prisma.ansibleConfig.findMany();
    res.json(ansibleConfigs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Ansible configs" });
  }
});

// Get Ansible config by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const ansibleConfig = await prisma.ansibleConfig.findUnique({
      where: { id }
    });
    if (!ansibleConfig) {
      return res.status(404).json({ error: "Ansible config not found" });
    }
    res.json(ansibleConfig);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Ansible config" });
  }
});

// Update Ansible config by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, config_file } = req.body;
  try {
    const updatedConfig = await prisma.ansibleConfig.update({
      where: { id },
      data: { name, config_file }
    });
    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ error: "Failed to update Ansible config" });
  }
});

// Delete Ansible config by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.ansibleConfig.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete Ansible config" });
  }
});

export default router;
