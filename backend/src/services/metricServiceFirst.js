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

      const influxDB = new InfluxDB({
        url: dataSource.url,
        token: dataSource.token
      });

      const queryApi = influxDB.getQueryApi(dataSource.database);
      
      // Query untuk mengambil data telemetri
      const fluxQuery = `
        from(bucket: "${dataSource.measurement}")
          |> range(start: -5m)
          |> filter(fn: (r) => r["_measurement"] == "telemetry")
          |> last()
      `;

      const result = await this.executeQuery(queryApi, fluxQuery);
      const metrics = this.processMetrics(result);

      // Evaluasi alert rules untuk metrik yang baru diambil
      await this.evaluateAlertRules(dataSourceId, metrics);

      return metrics;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  async executeQuery(queryApi, query) {
    return new Promise((resolve, reject) => {
      const data = [];
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const result = tableMeta.toObject(row);
          data.push(result);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(data);
        },
      });
    });
  }

  processMetrics(rawData) {
    // Konversi data InfluxDB ke format yang sesuai
    return rawData.reduce((acc, row) => {
      const measurement = row._measurement;
      const field = row._field;
      const value = row._value;
      
      if (!acc[measurement]) {
        acc[measurement] = {};
      }
      acc[measurement][field] = value;
      
      return acc;
    }, {});
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
        if (metricValue !== undefined) {
          await alertService.processAlert(rule, metricValue);
        }
      }
    } catch (error) {
      console.error('Error evaluating alert rules:', error);
      throw error;
    }
  }

  extractMetricValue(metrics, metricPath) {
    // Format metricPath: "measurement.field"
    const [measurement, field] = metricPath.split('.');
    return metrics[measurement]?.[field];
  }
}

export default new MetricService(); 