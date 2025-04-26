import { create } from 'zustand';
import { useApiStore } from './apiStore';

// Definisikan tipe data DataSource
export interface DataSource {
  id: string;
  name: string;
  type: string;
  url: string;
  token?: string;
  username?: string;
  password?: string;
  database?: string;
  organization?: string;
  createdAt: string;
  updatedAt: string;
}

// Konstanta API keys
export const API_KEYS = {
  GET_DATA_SOURCES: 'get_data_sources',
  GET_DATA_SOURCE: 'get_data_source',
  CREATE_DATA_SOURCE: 'create_data_source',
  UPDATE_DATA_SOURCE: 'update_data_source',
  DELETE_DATA_SOURCE: 'delete_data_source',
};

// Interface untuk DataSource state
interface DataSourceState {
  // Data state
  dataSources: DataSource[];
  currentDataSource: DataSource | null;
  
  // Actions
  fetchDataSources: () => Promise<DataSource[]>;
  fetchDataSource: (id: string) => Promise<DataSource>;
  createDataSource: (dataSource: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DataSource>;
  updateDataSource: (id: string, dataSource: Partial<DataSource>) => Promise<DataSource>;
  deleteDataSource: (id: string) => Promise<void>;
  
  // Helper untuk mengecek status loading
  isLoading: (key: string) => boolean;
  
  // Helper untuk mengecek status error
  getError: (key: string) => any;
  clearError: (key: string) => void;
}

// Membuat store DataSource
export const useDataSourceStore = create<DataSourceState>((set, get) => {
  // Akses ke API store
  const apiStore = useApiStore;
  
  return {
    // Data state dengan nilai awal
    dataSources: [],
    currentDataSource: null,
    
    // Fetch semua data sources
    fetchDataSources: async () => {
      try {
        const dataSources = await apiStore.getState().get<DataSource[]>('/data-sources', API_KEYS.GET_DATA_SOURCES);
        set({ dataSources });
        return dataSources;
      } catch (error) {
        console.error('Error fetching data sources:', error);
        throw error;
      }
    },
    
    // Fetch single data source by ID
    fetchDataSource: async (id: string) => {
      const key = `${API_KEYS.GET_DATA_SOURCE}_${id}`;
      try {
        const dataSource = await apiStore.getState().get<DataSource>(`/data-sources/${id}`, key);
        set({ currentDataSource: dataSource });
        return dataSource;
      } catch (error) {
        console.error(`Error fetching data source with id ${id}:`, error);
        throw error;
      }
    },
    
    // Create new data source
    createDataSource: async (dataSource) => {
      try {
        const newDataSource = await apiStore.getState().post<DataSource>('/data-sources', dataSource, API_KEYS.CREATE_DATA_SOURCE);
        set(state => ({ 
          dataSources: [...state.dataSources, newDataSource],
          currentDataSource: newDataSource
        }));
        return newDataSource;
      } catch (error) {
        console.error('Error creating data source:', error);
        throw error;
      }
    },
    
    // Update existing data source
    updateDataSource: async (id, dataSource) => {
      const key = `${API_KEYS.UPDATE_DATA_SOURCE}_${id}`;
      try {
        const updatedDataSource = await apiStore.getState().put<DataSource>(`/data-sources/${id}`, dataSource, key);
        set(state => ({
          dataSources: state.dataSources.map(ds => 
            ds.id === id ? updatedDataSource : ds
          ),
          currentDataSource: updatedDataSource
        }));
        return updatedDataSource;
      } catch (error) {
        console.error(`Error updating data source with id ${id}:`, error);
        throw error;
      }
    },
    
    // Delete data source
    deleteDataSource: async (id) => {
      const key = `${API_KEYS.DELETE_DATA_SOURCE}_${id}`;
      try {
        await apiStore.getState().delete<void>(`/data-sources/${id}`, key);
        set(state => ({
          dataSources: state.dataSources.filter(ds => ds.id !== id),
          currentDataSource: state.currentDataSource?.id === id ? null : state.currentDataSource
        }));
      } catch (error) {
        console.error(`Error deleting data source with id ${id}:`, error);
        throw error;
      }
    },
    
    // Helper untuk cek loading status
    isLoading: (key: string) => {
      return apiStore.getState().loading[key] || false;
    },
    
    // Helper untuk mengambil error
    getError: (key: string) => {
      return apiStore.getState().errors[key];
    },
    
    // Helper untuk menghapus error
    clearError: (key: string) => {
      apiStore.getState().clearError(key);
    }
  };
}); 