// src/controllers/ansiblePlaybookController.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new Ansible Playbook
router.post('/', async (req, res) => {
  const { ansibleConfigId, name, playbook_file } = req.body;
  try {
    const playbook = await prisma.ansiblePlaybook.create({
      data: { ansibleConfigId, name, playbook_file }
    });
    res.json(playbook);
  } catch (error) {
    res.status(500).json({ error: "Failed to create Ansible playbook" });
  }
});

// Get all Ansible Playbooks
router.get('/', async (req, res) => {
  try {
    const playbooks = await prisma.ansiblePlaybook.findMany();
    res.json(playbooks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Ansible playbooks" });
  }
});

// Get Ansible Playbook by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const playbook = await prisma.ansiblePlaybook.findUnique({
      where: { id }
    });
    if (!playbook) {
      return res.status(404).json({ error: "Ansible playbook not found" });
    }
    res.json(playbook);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Ansible playbook" });
  }
});

// Update Ansible Playbook by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, playbook_file } = req.body;
  try {
    const updatedPlaybook = await prisma.ansiblePlaybook.update({
      where: { id },
      data: { name, playbook_file }
    });
    res.json(updatedPlaybook);
  } catch (error) {
    res.status(500).json({ error: "Failed to update Ansible playbook" });
  }
});

// Delete Ansible Playbook by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.ansiblePlaybook.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete Ansible playbook" });
  }
});

export default router;
