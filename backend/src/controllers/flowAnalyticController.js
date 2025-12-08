import { PrismaClient } from '@prisma/client';
import flowAnalyticService from '../services/flowAnalyticService.js';

const prisma = new PrismaClient();

export const createFlowAnalytic = async (req, res) => {
  try {
    const { name, sourceQuery, destinationQuery, dataSourceId, userId } = req.body;

    if (!sourceQuery || !destinationQuery || !dataSourceId) {
      return res.status(400).json({ error: 'sourceQuery, destinationQuery, and dataSourceId are required' });
    }

    const flowAnalytic = await prisma.flowAnalytic.create({
      data: {
        name: name || `Flow ${new Date().toISOString()}`,
        sourceQuery,
        destinationQuery,
        dataSourceId,
        userId: userId || null,
      },
    });

    res.json(flowAnalytic);
  } catch (error) {
    console.error('Error creating flow analytic:', error);
    res.status(500).json({ error: 'Failed to create flow analytic' });
  }
};

export const getFlowAnalytics = async (req, res) => {
  try {
    const flowAnalytics = await prisma.flowAnalytic.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(flowAnalytics);
  } catch (error) {
    console.error('Error getting flow analytics:', error);
    res.status(500).json({ error: 'Failed to get flow analytics' });
  }
};

export const getFlowAnalyticById = async (req, res) => {
  try {
    const { id } = req.params;

    const flowAnalytic = await prisma.flowAnalytic.findUnique({
      where: { id },
    });

    if (!flowAnalytic) {
      return res.status(404).json({ error: 'Flow analytic not found' });
    }

    res.json(flowAnalytic);
  } catch (error) {
    console.error('Error getting flow analytic:', error);
    res.status(500).json({ error: 'Failed to get flow analytic' });
  }
};

export const executeFlowAnalytic = async (req, res) => {
  try {
    const { sourceQuery, destinationQuery, dataSourceId } = req.body;

    if (!sourceQuery || !destinationQuery || !dataSourceId) {
      return res.status(400).json({ error: 'sourceQuery, destinationQuery, and dataSourceId are required' });
    }

    // Get data source
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Execute both queries
    const result = await flowAnalyticService.executeFlowQueries(
      dataSource,
      sourceQuery,
      destinationQuery
    );

    res.json(result);
  } catch (error) {
    console.error('Error executing flow analytic:', error);
    res.status(500).json({ error: error.message || 'Failed to execute flow analytic' });
  }
};

export const deleteFlowAnalytic = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.flowAnalytic.delete({
      where: { id },
    });

    res.json({ message: 'Flow analytic deleted successfully' });
  } catch (error) {
    console.error('Error deleting flow analytic:', error);
    res.status(500).json({ error: 'Failed to delete flow analytic' });
  }
};

export const updateFlowAnalytic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sourceQuery, destinationQuery, dataSourceId } = req.body;

    const flowAnalytic = await prisma.flowAnalytic.update({
      where: { id },
      data: {
        name,
        sourceQuery,
        destinationQuery,
        dataSourceId,
      },
    });

    res.json(flowAnalytic);
  } catch (error) {
    console.error('Error updating flow analytic:', error);
    res.status(500).json({ error: 'Failed to update flow analytic' });
  }
};
