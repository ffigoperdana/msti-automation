import { API_ENDPOINTS } from '../config';

export interface DataSource {
  id: string;
  name: string;
  url: string;
  type?: string;
  token?: string;
  username?: string;
  password?: string;
  database?: string;
  organization?: string;
  measurement?: string;
  isDefault: boolean;
}

type FetchApi = <T>(url: string, options?: RequestInit) => Promise<T>;

export const dataSourceService = {
  async getDataSources(fetchApi: FetchApi): Promise<DataSource[]> {
    return fetchApi(API_ENDPOINTS.DATA_SOURCES);
  },

  async getDataSource(fetchApi: FetchApi, id: string): Promise<DataSource> {
    return fetchApi(`${API_ENDPOINTS.DATA_SOURCES}/${id}`);
  },

  async createDataSource(fetchApi: FetchApi, data: Omit<DataSource, 'id'>): Promise<DataSource> {
    return fetchApi(API_ENDPOINTS.DATA_SOURCES, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDataSource(fetchApi: FetchApi, id: string, data: Partial<DataSource>): Promise<DataSource> {
    return fetchApi(`${API_ENDPOINTS.DATA_SOURCES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteDataSource(fetchApi: FetchApi, id: string): Promise<void> {
    return fetchApi(`${API_ENDPOINTS.DATA_SOURCES}/${id}`, {
      method: 'DELETE',
    });
  },

  async testConnection(fetchApi: FetchApi, data: Partial<DataSource>): Promise<{ success: boolean; message?: string }> {
    return fetchApi(`${API_ENDPOINTS.DATA_SOURCES}/test`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
}; 