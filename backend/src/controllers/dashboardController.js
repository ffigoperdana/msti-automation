import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dashboard Controllers
export const getDashboards = async (req, res) => {
  try {
    const dashboards = await prisma.visualization.findMany({
      where: {
        type: 'dashboard',
        dashboardId: null // Only get root dashboards
      },
      include: {
        panels: {
          include: {
            dataSource: true,
            queries: true
          }
        },
        variables: true
      }
    });
    res.json(dashboards);
  } catch (error) {
    console.error('Error getting dashboards:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const dashboard = await prisma.visualization.findUnique({
      where: { id },
      include: {
        panels: {
          include: {
            dataSource: true,
            queries: true
          }
        },
        variables: true
      }
    });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    res.json(dashboard);
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createDashboard = async (req, res) => {
  try {
    const { name, description, tags = [], panels = [], variables = [] } = req.body;

    // Create dashboard
    const dashboard = await prisma.visualization.create({
      data: {
        name,
        type: 'dashboard',
        config: {
          description,
          tags
        },
        panels: {
          create: panels.map(panel => ({
            name: panel.title,
            type: panel.type,
            config: {
              description: panel.description,
              width: panel.width,
              height: panel.height,
              position: panel.position,
              options: panel.options
            },
            queries: {
              create: panel.queries.map(query => ({
                refId: query.refId,
                query: query.query,
                dataSourceId: query.dataSourceId
              }))
            }
          }))
        },
        variables: {
          create: variables.map(variable => ({
            name: variable.name,
            label: variable.label,
            type: variable.type,
            query: variable.query,
            value: variable.value
          }))
        }
      },
      include: {
        panels: {
          include: {
            dataSource: true,
            queries: true
          }
        },
        variables: true
      }
    });

    res.json(dashboard);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tags } = req.body;

    const dashboard = await prisma.visualization.update({
      where: { id },
      data: {
        name,
        config: {
          description,
          tags
        }
      },
      include: {
        panels: {
          include: {
            dataSource: true,
            queries: true
          }
        },
        variables: true
      }
    });

    res.json(dashboard);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.visualization.delete({
      where: { id }
    });
    res.json({ message: 'Dashboard deleted successfully' });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

// Panel Controllers
export const createPanel = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const panelData = req.body;
    
    const panel = await prisma.panel.create({
      data: {
        ...panelData,
        dashboardId
      }
    });
    
    res.json(panel);
  } catch (error) {
    console.error('Error creating panel:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updatePanel = async (req, res) => {
  try {
    const { id } = req.params;
    const panelData = req.body;
    
    const panel = await prisma.panel.update({
      where: { id },
      data: panelData
    });
    
    res.json(panel);
  } catch (error) {
    console.error('Error updating panel:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deletePanel = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.panel.delete({
      where: { id }
    });
    res.json({ message: 'Panel deleted successfully' });
  } catch (error) {
    console.error('Error deleting panel:', error);
    res.status(500).json({ error: error.message });
  }
}; 