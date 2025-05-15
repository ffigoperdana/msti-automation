import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import alertService from './alertService.js';
import { InfluxDB } from '@influxdata/influxdb-client';

const prisma = new PrismaClient();

class MetricService {
  async fetchMetrics(dataSourceId) {
    try {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId }
      });

      if (!dataSource) {
        throw new Error('Data source not found');
      }

      // Ambil data dari InfluxDB atau sumber data lainnya
      const response = await axios.get(dataSource.url, {
        headers: {
          Authorization: `Token ${dataSource.token}`
        },
        params: {
          db: dataSource.database,
          q: `SELECT * FROM ${dataSource.measurement} WHERE time > now() - 5m`
        }
      });

      const metrics = this.processMetrics(response.data);

      // Evaluasi alert rules untuk metrik yang baru diambil
      await this.evaluateAlertRules(dataSourceId, metrics);

      return metrics;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  processMetrics(rawData) {
    // Proses data mentah menjadi format yang sesuai
    // Implementasi akan tergantung pada format data sumber
    return rawData;
  }

  async evaluateAlertRules(dataSourceId, metrics) {
    try {
      // Ambil semua alert rules yang aktif untuk data source ini
      const alertRules = await prisma.alertRule.findMany({
        where: {
          dataSourceId,
          enabled: true
        }
      });

      // Evaluasi setiap alert rule
      for (const rule of alertRules) {
        const metricValue = this.extractMetricValue(metrics, rule.metric_path);
        await alertService.processAlert(rule, metricValue);
      }
    } catch (error) {
      console.error('Error evaluating alert rules:', error);
      throw error;
    }
  }

  extractMetricValue(metrics, metricPath) {
    // Ekstrak nilai metrik berdasarkan path yang ditentukan
    // Implementasi akan tergantung pada struktur data metrik
    return metrics[metricPath];
  }

  async executeQuery(queryApi, queryConfig) {
    try {
      const { bucket, measurement, field, aggregateWindow } = queryConfig;

      console.log('Executing Flux query with config:', queryConfig);

      // Buat query Flux dengan format yang benar untuk timeRange
      const query = `
        from(bucket: "${bucket}")
          |> range(start: -5m)
          |> filter(fn: (r) => r["_measurement"] == "${measurement}")
          |> filter(fn: (r) => r["_field"] == "${field}")
          |> aggregateWindow(
            every: ${aggregateWindow},
            fn: mean,
            createEmpty: false
          )
      `;

      console.log('Generated Flux query:', query);

      // Execute query
      const result = await this.runQuery(queryApi, query);
      console.log('Query result:', result);
      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  async runQuery(queryApi, query) {
    return new Promise((resolve, reject) => {
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
  }

  formatQueryResult(data, config) {
    // Format data sesuai dengan struktur yang dibutuhkan untuk visualisasi
    return {
      state: "Done",
      series: [{
        name: config.measurement,
        refId: "A",
        meta: {
          executedQueryString: config.query
        },
        fields: [
          {
            name: "Time",
            type: "time",
            values: data.map(row => new Date(row._time).getTime()),
            config: {
              unit: config.unit || "percent"
            }
          },
          {
            name: config.field,
            type: "number",
            values: data.map(row => row._value),
            labels: data[0] ? this.extractLabels(data[0]) : {},
            config: {
              unit: config.unit || "percent",
              max: 100,
              min: 0
            }
          }
        ],
        length: data.length
      }]
    };
  }

  extractLabels(row) {
    // Ekstrak label dari baris data
    const labels = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key.startsWith('_') && typeof value === 'string') {
        labels[key] = value;
      }
    }
    return labels;
  }

  async saveVisualization(data) {
    try {
      const visualization = await prisma.visualization.create({
        data: {
          type: data.type,
          name: data.name,
          config: data.config,
          queryConfig: data.queryConfig,
          dataSourceId: data.dataSourceId
        }
      });

      return visualization;
    } catch (error) {
      console.error('Error saving visualization:', error);
      throw error;
    }
  }

  async getVisualization(id) {
    try {
      const visualization = await prisma.visualization.findUnique({
        where: { id }
      });

      if (!visualization) {
        throw new Error('Visualization not found');
      }

      // Ambil data terbaru untuk visualisasi
      const result = await this.executeQuery(
        visualization.dataSourceId,
        visualization.queryConfig
      );

      return {
        ...visualization,
        data: result
      };
    } catch (error) {
      console.error('Error getting visualization:', error);
      throw error;
    }
  }

  async executeFluxQuery(queryApi, query, variables = {}) {
    try {
      // Pastikan format time range yang benar
      const timeRange = variables.timeRange || {
        from: '-1h', // Default 1 jam ke belakang
        to: 'now()'
      };

      // Ganti placeholder time range jika ada
      const queryWithTimeRange = query.replace(/start: now\(\) - 1h/, `start: ${timeRange.from}`);

      console.log('Executing Flux query:', queryWithTimeRange);

      // Execute query
      const rawResult = await this.runQuery(queryApi, queryWithTimeRange);
      
      if (!rawResult || !Array.isArray(rawResult) || rawResult.length === 0) {
        return {
          state: "Done",
          series: []
        };
      }

      // Format response sesuai dengan yang diharapkan frontend
      const formattedResult = {
        state: "Done",
        series: [{
          name: "Interface Status",
          refId: "A",
          meta: {
            executedQueryString: queryWithTimeRange
          },
          fields: [
            {
              name: "Time",
              type: "time",
              values: rawResult.map(row => new Date(row._time).getTime()),
              config: {
                unit: "time"
              }
            },
            {
              name: "Value",
              type: "number",
              values: rawResult.map(row => typeof row._value === 'string' ? 
                row._value === 'up' ? 1 : 0 : 
                row._value
              ),
              config: {
                unit: "status"
              }
            }
          ],
          length: rawResult.length
        }]
      };

      return formattedResult;
    } catch (error) {
      console.error('Error executing Flux query:', error);
      throw error;
    }
  }

  formatFluxQueryResult(data, config) {
    if (!data || data.length === 0) {
      return {
        state: "Done",
        series: []
      };
    }

    // Group data by measurement and field
    const groupedData = this.groupDataByMeasurement(data);

    // Format each series
    const series = Object.entries(groupedData).map(([key, rows]) => {
      const [measurement, field] = key.split('::');
      
      return {
        name: measurement,
        refId: "A",
        meta: {
          executedQueryString: config.query
        },
        fields: [
          {
            name: "Time",
            type: "time",
            typeInfo: {
              frame: "time.Time",
              nullable: true
            },
            config: {
              unit: "time"
            },
            values: rows.map(row => new Date(row._time).getTime())
          },
          {
            name: field || "_value",
            type: "number",
            typeInfo: {
              frame: "float64",
              nullable: true
            },
            labels: this.extractLabels(rows[0]),
            config: {
              unit: "percent"
            },
            values: rows.map(row => row._value)
          }
        ],
        length: rows.length
      };
    });

    return {
      state: "Done",
      series,
      request: {
        app: "dashboard",
        requestId: this.generateRequestId(),
        timezone: "browser",
        range: config.timeRange,
        targets: [
          {
            query: config.query,
            refId: "A"
          }
        ]
      }
    };
  }

  groupDataByMeasurement(data) {
    return data.reduce((acc, row) => {
      const key = `${row._measurement}::${row._field}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {});
  }

  generateRequestId() {
    return 'REQ' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async getMetrics() {
    try {
      // Ambil default data source atau data source pertama
      const dataSource = await prisma.dataSource.findFirst();
      
      if (!dataSource) {
        return {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: []
        };
      }

      const metrics = await this.fetchMetrics(dataSource.id);
      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }
}

export default new MetricService(); 