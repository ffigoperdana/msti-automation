import { FluxQueryResponse, FluxQueryParams } from '../types/flux';
import { API_ENDPOINTS } from '../config';
import api from './api';

export interface QueryConfig {
  measurement: string;
  field: string;
  aggregateWindow?: {
    every: string;
    fn: string;
  };
  filters?: Array<{
    key: string;
    value: string;
    operator: string;
  }>;
}

export interface QueryResult {
  state: string;
  series: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      values: any[];
    }>;
  }>;
}

class MetricService {

  async getDataSourceMetrics(dataSourceId: string) {
    try {
      console.log('Fetching metrics for data source:', dataSourceId);
      const response = await api.get(API_ENDPOINTS.DATA_SOURCE_METRICS(dataSourceId));
      console.log('Metrics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching data source metrics:', error);
      throw error;
    }
  }

  async executeQuery(queryApi: any, queryConfig: QueryConfig): Promise<QueryResult> {
    // Build Flux query
    let query = `from(bucket: "${queryConfig.measurement}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "${queryConfig.measurement}")
      |> filter(fn: (r) => r._field == "${queryConfig.field}")`;

    // Add filters if any
    if (queryConfig.filters) {
      queryConfig.filters.forEach(filter => {
        query += `\n  |> filter(fn: (r) => r.${filter.key} ${filter.operator} "${filter.value}")`;
      });
    }

    // Add aggregation if specified
    if (queryConfig.aggregateWindow) {
      query += `\n  |> aggregateWindow(
        every: ${queryConfig.aggregateWindow.every},
        fn: ${queryConfig.aggregateWindow.fn},
        createEmpty: false
      )`;
    }

    return this.executeFluxQuery(queryApi, query);
  }

  async executeFluxQuery(dataSourceId: string, rawQuery: string, variables: Record<string, any> = {}) {
    try {
      const response = await api.post('/visualizations/flux-query', {
        dataSourceId,
        query: rawQuery,
        variables
      });
      return response.data;
    } catch (error) {
      console.error('Error executing flux query:', error);
      throw error;
    }
  }

  // Panel methods
  async getPanel(id: string) {
    try {
      const response = await api.get(`/visualizations/panels/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting panel:', error);
      throw error;
    }
  }

  async createPanel(dashboardId: string, data: any) {
    try {
      const response = await api.post(`/visualizations/dashboards/${dashboardId}/panels`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating panel:', error);
      throw error;
    }
  }

  async updatePanel(id: string, data: any) {
    try {
      const response = await api.put(`/visualizations/panels/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating panel:', error);
      throw error;
    }
  }

  async deletePanel(id: string) {
    try {
      await api.delete(`/visualizations/panels/${id}`);
    } catch (error) {
      console.error('Error deleting panel:', error);
      throw error;
    }
  }

  async executePanelQuery(id: string) {
    try {
      const response = await api.post(`/visualizations/panels/${id}/query`);
      return response.data;
    } catch (error) {
      console.error('Error executing panel query:', error);
      throw error;
    }
  }

  // Dashboard methods
  async getDashboard(id: string) {
    try {
      const response = await api.get(`${API_ENDPOINTS.DASHBOARDS}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting dashboard:', error);
      throw error;
    }
  }

  async getDashboards() {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARDS);
      return response.data;
    } catch (error) {
      console.error('Error getting dashboards:', error);
      throw error;
    }
  }

  async createDashboard(data: any) {
    try {
      const response = await api.post(API_ENDPOINTS.DASHBOARDS, data);
      return response.data;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  }

  async updateDashboard(id: string, data: any) {
    try {
      const response = await api.put(`${API_ENDPOINTS.DASHBOARDS}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating dashboard:', error);
      throw error;
    }
  }

  async deleteDashboard(id: string) {
    try {
      await api.delete(`${API_ENDPOINTS.DASHBOARDS}/${id}`);
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      throw error;
    }
  }

  // Source methods
  async getSources() {
    try {
      const response = await api.get(API_ENDPOINTS.DATA_SOURCES);
      return response.data;
    } catch (error) {
      console.error('Error fetching sources:', error);
      throw error;
    }
  }

  async getSource(id: string) {
    try {
      const response = await api.get(`${API_ENDPOINTS.DATA_SOURCES}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching source:', error);
      throw error;
    }
  }

  async createSource(source: any) {
    try {
      const response = await api.post(API_ENDPOINTS.DATA_SOURCES, source);
      return response.data;
    } catch (error) {
      console.error('Error creating source:', error);
      throw error;
    }
  }

  async updateSource(id: string, source: any) {
    try {
      const response = await api.put(`/sources/${id}`, source);
      return response.data;
    } catch (error) {
      console.error('Error updating source:', error);
      throw error;
    }
  }

  async deleteSource(id: string) {
    try {
      const response = await api.delete(`/sources/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting source:', error);
      throw error;
    }
  }

  async testSource(source: any) {
    try {
      const response = await api.post('/sources/test', source);
      return response.data;
    } catch (error) {
      console.error('Error testing source:', error);
      throw error;
    }
  }

  // Validasi dan preview query Flux
  async validateQuery(params: FluxQueryParams): Promise<FluxQueryResponse> {
    try {
      const response = await api.post<FluxQueryResponse>(
        API_ENDPOINTS.DATA_SOURCE_QUERY(params.dataSourceId),
        { query: params.query }
      );
      
      if (!response.data || !response.data.series) {
        throw new Error('Invalid response format from server');
      }

      return response.data;
    } catch (error) {
      console.error('Error validating query:', error);
      throw error;
    }
  }

  async validateFluxQuery(dataSourceId: string, query: string): Promise<{ isValid: boolean; error?: string; data?: any }> {
    try {
      // Validasi dasar sintaks query
      if (!query.trim()) {
        return { isValid: false, error: 'Query tidak boleh kosong' };
      }

      // Pastikan query memiliki komponen dasar yang diperlukan
      const requiredComponents = ['from(', 'range('];
      const missingComponents = requiredComponents.filter(comp => !query.includes(comp));
      
      if (missingComponents.length > 0) {
        return { 
          isValid: false, 
          error: `Query harus memiliki komponen: ${missingComponents.join(', ')}` 
        };
      }

      // Kirim query ke endpoint validasi
      const response = await api.post(`${API_ENDPOINTS.VALIDATE_FLUX_QUERY}`, {
        dataSourceId,
        query
      });

      // Jika ada data, berarti query valid
      if (response.data && response.data.data) {
        return {
          isValid: true,
          data: response.data.data
        };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Error validating flux query:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Gagal memvalidasi query';
      return { 
        isValid: false, 
        error: errorMessage
      };
    }
  }

  async getMetrics(dataSourceId: string) {
    try {
      const response = await api.get(`/api/visualizations/metrics?dataSourceId=${dataSourceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

}

export default new MetricService(); 