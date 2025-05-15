// src/controllers/visualizationController.js
import { PrismaClient } from '@prisma/client';
import { InfluxDB } from '@influxdata/influxdb-client';
import metricService from '../services/metricService.js';

const prisma = new PrismaClient();

// Data Source Controllers
export const getDataSources = async (req, res) => {
  try {
    const sources = await prisma.dataSource.findMany();
    res.json(sources);
  } catch (error) {
    console.error('Error getting data sources:', error);
    res.status(500).json({ error: 'Failed to get data sources' });
  }
};

export const getDataSourceMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const dataSource = await prisma.dataSource.findUnique({
      where: { id }
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Buat InfluxDB client
    const client = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = client.getQueryApi(dataSource.organization);

    // Query untuk mendapatkan semua measurements
    const query = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${dataSource.database}")
    `;

    const result = await new Promise((resolve, reject) => {
      const measurements = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const measurement = tableMeta.toObject(row)._value;
          measurements.push(measurement);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(measurements);
        },
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error getting data source metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
};

export const executeDataSourceQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = req.body;

    const dataSource = await prisma.dataSource.findUnique({
      where: { id }
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Buat InfluxDB client
    const client = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = client.getQueryApi(dataSource.organization);

    // Execute query
    const result = await new Promise((resolve, reject) => {
      const rows = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(rows);
        },
      });
    });

    // Format hasil untuk frontend
    const formattedResult = {
      state: "Done",
      series: [{
        name: "Query Result",
        refId: "A",
        meta: {
          executedQueryString: query
        },
        fields: [
          {
            name: "Time",
            type: "time",
            values: result.map(row => new Date(row._time).getTime()),
            config: {
              unit: "time"
            }
          },
          {
            name: "Value",
            type: "string",
            values: result.map(row => {
              // Jika _value adalah string, gunakan langsung
              if (typeof row._value === 'string') {
                return row._value.toUpperCase();
              }
              // Jika _value adalah number, konversi ke UP/DOWN
              if (typeof row._value === 'number') {
                return row._value === 1 ? 'UP' : 'DOWN';
              }
              // Jika operSt ada, gunakan itu
              if (row.operSt) {
                return row.operSt.toUpperCase();
              }
              return 'UNKNOWN';
            }),
            config: {
              unit: "status"
            }
          }
        ],
        length: result.length
      }]
    };

    res.json(formattedResult);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Failed to execute query' });
  }
};

// Execute raw Flux query
export const executeFluxQuery = async (req, res) => {
  try {
    const { dataSourceId, query } = req.body;
    
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId }
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const client = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = client.getQueryApi(dataSource.organization);
    const result = await metricService.executeFluxQuery(queryApi, query);

    res.json(result);
  } catch (error) {
    console.error('Error executing Flux query:', error);
    res.status(500).json({ error: 'Failed to execute query' });
  }
};

// Execute query untuk visualisasi
export const executeVisualizationQuery = async (req, res) => {
  try {
    const { dataSourceId, queryConfig } = req.body;
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId }
    });

    if (!dataSource) {
      return res.status(404).json({ error: "Data source not found" });
    }

    const influxDB = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = influxDB.getQueryApi(dataSource.organization);
    const result = await metricService.executeQuery(queryApi, queryConfig);
    res.json(result);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message || "Failed to execute query" });
  }
};

// Get all dashboards
export const getDashboards = async (req, res) => {
  try {
    const dashboards = await prisma.visualization.findMany({
      where: {
        type: 'dashboard',
        dashboardId: null
      },
      include: {
        panels: {
          include: {
            dataSource: true
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

// Get single dashboard
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

    // Transform dashboard data for frontend
    const transformedDashboard = {
      ...dashboard,
      panels: dashboard.panels.map(panel => ({
        id: panel.id,
        title: panel.name,
        type: panel.type,
        description: panel.config?.description || '',
        width: panel.config?.width || 12,
        height: panel.config?.height || 8,
        options: panel.config?.options || {},
        position: panel.position || { x: 0, y: 0 },
        dataSourceId: panel.dataSourceId,
        queries: panel.queries.map(q => ({
          refId: q.refId,
          query: q.query,
          dataSourceId: q.dataSourceId
        }))
      }))
    };
    
    res.json(transformedDashboard);
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new dashboard
export const createDashboard = async (req, res) => {
  try {
    const { name, description, tags, panels } = req.body;
    
    const dashboard = await prisma.visualization.create({
      data: {
        name,
        type: 'dashboard',
        config: {
          description,
          tags
        },
        panels: {
          create: panels?.map(panel => ({
            name: panel.title,
            type: panel.type,
            config: {
              description: panel.description,
              width: panel.width || 12,
              height: panel.height || 8,
              options: panel.options || {}
            },
            position: panel.position || { x: 0, y: 0 },
            dataSourceId: panel.dataSourceId,
            queries: {
              create: panel.queries?.map(q => ({
                refId: q.refId,
                query: q.query,
                dataSourceId: panel.dataSourceId
              }))
            }
          }))
        }
      },
      include: {
        panels: {
          include: {
            queries: true
          }
        }
      }
    });
    
    res.json(dashboard);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update dashboard
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
            queries: true
          }
        }
      }
    });
    
    res.json(dashboard);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete dashboard
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

// Create panel in dashboard
export const createPanel = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { title, description, type, width, height, position, options, dataSourceId, queries } = req.body;
    
    const panel = await prisma.visualization.create({
      data: {
        name: title,
        type,
        config: {
          description,
          width: width || 12,
          height: height || 8,
          options: options || {}
        },
        position,
        dataSourceId,
        dashboardId,
        queries: {
          create: queries?.map(q => ({
            refId: q.refId,
            query: q.query,
            dataSourceId
          }))
        }
      },
      include: {
        queries: true,
        dataSource: true
      }
    });
    
    res.json(panel);
  } catch (error) {
    console.error('Error creating panel:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update panel
export const updatePanel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, width, height, position, options, dataSourceId, queries } = req.body;
    
    await prisma.query.deleteMany({
      where: { visualizationId: id }
    });
    
    const panel = await prisma.visualization.update({
      where: { id },
      data: {
        name: title,
        type,
        config: {
          description,
          width,
          height,
          options
        },
        position,
        dataSourceId,
        queries: {
          create: queries?.map(q => ({
            refId: q.refId,
            query: q.query,
            dataSourceId
          }))
        }
      },
      include: {
        queries: true,
        dataSource: true
      }
    });
    
    res.json(panel);
  } catch (error) {
    console.error('Error updating panel:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete panel
export const deletePanel = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.visualization.delete({
      where: { id }
    });
    res.json({ message: 'Panel deleted successfully' });
  } catch (error) {
    console.error('Error deleting panel:', error);
    res.status(500).json({ error: error.message });
  }
};

// Execute panel query
export const executePanelQuery = async (req, res) => {
  try {
    const panel = await prisma.visualization.findUnique({
      where: { id: req.params.id },
      include: {
        queries: {
          include: {
            dataSource: true
          }
        }
      }
    });

    if (!panel) {
      return res.status(404).json({ error: "Panel not found" });
    }

    const results = await Promise.all(panel.queries.map(async (query) => {
      if (!query.dataSource) {
        throw new Error(`Data source not found for query`);
      }

      const influxDB = new InfluxDB({
        url: query.dataSource.url,
        token: query.dataSource.token
      });

      const queryApi = influxDB.getQueryApi(query.dataSource.organization);

      // Execute query
      const rows = await new Promise((resolve, reject) => {
        const data = [];
        queryApi.queryRows(query.query, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            data.push(o);
          },
          error(error) {
            reject(error);
          },
          complete() {
            resolve(data);
          },
        });
      });

      // Format hasil untuk interface status panel
      const formattedResult = {
        state: "Done",
        series: [{
          name: "Interface Status",
          refId: query.refId,
          meta: {
            executedQueryString: query.query
          },
          fields: [
            {
              name: "Time",
              type: "time",
              values: rows.map(row => new Date(row._time).getTime()),
              config: {
                unit: "time"
              }
            },
            {
              name: "Value",
              type: "string",
              values: rows.map(row => {
                // Jika _value adalah string, gunakan langsung
                if (typeof row._value === 'string') {
                  return row._value.toUpperCase();
                }
                // Jika _value adalah number, konversi ke UP/DOWN
                if (typeof row._value === 'number') {
                  return row._value === 1 ? 'UP' : 'DOWN';
                }
                // Jika operSt ada, gunakan itu
                if (row.operSt) {
                  return row.operSt.toUpperCase();
                }
                return 'UNKNOWN';
              }),
              config: {
                unit: "status"
              }
            }
          ],
          length: rows.length
        }]
      };

      return {
        refId: query.refId,
        result: formattedResult
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error executing panel query:', error);
    res.status(500).json({ error: error.message || "Failed to execute panel query" });
  }
};

// Get metrics data
export const getMetrics = async (req, res) => {
  try {
    const { dataSourceId } = req.query;
    
    if (!dataSourceId) {
      return res.status(400).json({ error: 'Data source ID is required' });
    }

    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId }
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const client = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = client.getQueryApi(dataSource.organization);

    // Query untuk mendapatkan semua measurements
    const query = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${dataSource.database}")
    `;

    const measurements = await new Promise((resolve, reject) => {
      const results = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const measurement = tableMeta.toObject(row)._value;
          results.push(measurement);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });

    res.json(measurements);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

// Query validation
export const validateQuery = async (req, res) => {
  try {
    const { dataSourceId, query, timeRange } = req.body;
    
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId }
    });
    
    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const influxDB = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = influxDB.getQueryApi(dataSource.organization);

    // Replace time range placeholders if they exist
    let modifiedQuery = query;
    if (timeRange) {
      modifiedQuery = query
        .replace(/start: -\d+[hmd]/, `start: ${timeRange.from}`)
        .replace(/stop: now\(\)/, `stop: ${timeRange.to}`);
    }

    console.log('Executing modified query:', modifiedQuery);

    const result = await new Promise((resolve, reject) => {
      const rows = [];
      queryApi.queryRows(modifiedQuery, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          rows.push(o);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(rows);
        },
      });
    });

    // Format hasil query untuk frontend
    const formattedResult = {
      state: "Done",
      series: [{
        name: "Query Result",
        refId: "A",
        meta: {
          executedQueryString: modifiedQuery
        },
        fields: [
          {
            name: "Time",
            type: "time",
            values: result.map(row => new Date(row._time).getTime()),
            config: {
              unit: "time"
            }
          },
          {
            name: "Value",
            type: "number",
            values: result.map(row => {
              if (typeof row._value === 'string') {
                return row._value.toLowerCase() === 'up' ? 1 : 0;
              }
              return row._value;
            }),
            config: {
              unit: "status"
            }
          }
        ],
        length: result.length
      }]
    };
    
    res.json(formattedResult);
  } catch (error) {
    console.error('Error validating query:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
};

// Validate Flux query
export const validateFluxQuery = async (req, res) => {
  try {
    const { dataSourceId, query } = req.body;
    
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId }
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source tidak ditemukan' });
    }

    const client = new InfluxDB({
      url: dataSource.url,
      token: dataSource.token
    });

    const queryApi = client.getQueryApi(dataSource.organization);

    try {
      // Eksekusi query untuk mendapatkan status interface
      const result = await new Promise((resolve, reject) => {
        const rows = [];
        queryApi.queryRows(query, {
          next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            rows.push(o);
          },
          error(error) {
            reject(error);
          },
          complete() {
            resolve(rows);
          },
        });
      });

      // Format hasil untuk interface status
      if (result.length > 0) {
        const lastValue = result[result.length - 1];
        const status = lastValue._value;
        const formattedStatus = typeof status === 'string' 
          ? status.toUpperCase() 
          : (status === 1 ? 'UP' : 'DOWN');

        res.json({
          valid: true,
          data: {
            status: formattedStatus,
            time: lastValue._time,
            metadata: {
              interface: lastValue.dn,
              source: lastValue.source
            }
          }
        });
      } else {
        res.json({
          valid: true,
          data: {
            status: 'UNKNOWN',
            time: new Date().toISOString(),
            metadata: {}
          }
        });
      }
    } catch (queryError) {
      // Jika ada error syntax atau eksekusi
      console.error('Query execution error:', queryError);
      res.status(400).json({ 
        error: queryError.message || 'Query tidak valid',
        details: queryError.stack
      });
    }
  } catch (error) {
    console.error('Error validating Flux query:', error);
    res.status(500).json({ error: 'Gagal memvalidasi query' });
  }
};

// Get panel
export const getPanel = async (req, res) => {
  try {
    const { id } = req.params;
    const panel = await prisma.visualization.findUnique({
      where: { id },
      include: {
        dataSource: true,
        queries: true
      }
    });

    if (!panel) {
      return res.status(404).json({ error: 'Panel not found' });
    }

    // Transform data untuk frontend
    const transformedPanel = {
      id: panel.id,
      title: panel.name,
      type: panel.type,
      description: panel.config?.description || '',
      width: panel.config?.width || 12,
      height: panel.config?.height || 8,
      options: panel.config?.options || {},
      position: panel.position || { x: 0, y: 0 },
      dataSourceId: panel.dataSourceId,
      queries: panel.queries.map(q => ({
        refId: q.refId,
        query: q.query,
        dataSourceId: q.dataSourceId
      }))
    };
    
    res.json(transformedPanel);
  } catch (error) {
    console.error('Error getting panel:', error);
    res.status(500).json({ error: error.message });
  }
};
