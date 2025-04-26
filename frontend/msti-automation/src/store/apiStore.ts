import { create } from 'zustand';
import api from '../services/api';

// Definisikan tipe data untuk state API
interface ApiState {
  // State untuk loading status API calls
  loading: Record<string, boolean>;
  // State untuk error API calls
  errors: Record<string, any>;
  
  // Actions untuk memperbarui state
  setLoading: (key: string, isLoading: boolean) => void;
  setError: (key: string, error: any) => void;
  clearError: (key: string) => void;
  
  // Utility methods untuk API calls
  get: <T>(url: string, key: string) => Promise<T>;
  post: <T>(url: string, data: any, key: string) => Promise<T>;
  put: <T>(url: string, data: any, key: string) => Promise<T>;
  delete: <T>(url: string, key: string) => Promise<T>;
}

// Buat store API menggunakan Zustand
export const useApiStore = create<ApiState>((set, get) => ({
  // Initial state
  loading: {},
  errors: {},
  
  // Action untuk mengatur loading state
  setLoading: (key: string, isLoading: boolean) => 
    set(state => ({
      loading: { ...state.loading, [key]: isLoading }
    })),
  
  // Action untuk mengatur error state
  setError: (key: string, error: any) => 
    set(state => ({
      errors: { ...state.errors, [key]: error }
    })),
  
  // Action untuk menghapus error
  clearError: (key: string) => 
    set(state => {
      const newErrors = { ...state.errors };
      delete newErrors[key];
      return { errors: newErrors };
    }),
  
  // Method GET dengan penanganan loading dan error
  get: async <T,>(url: string, key: string): Promise<T> => {
    get().setLoading(key, true);
    try {
      const response = await api.get(url);
      get().setError(key, null);
      return response.data as T;
    } catch (error) {
      get().setError(key, error);
      throw error;
    } finally {
      get().setLoading(key, false);
    }
  },
  
  // Method POST dengan penanganan loading dan error
  post: async <T,>(url: string, data: any, key: string): Promise<T> => {
    get().setLoading(key, true);
    try {
      const response = await api.post(url, data);
      get().setError(key, null);
      return response.data as T;
    } catch (error) {
      get().setError(key, error);
      throw error;
    } finally {
      get().setLoading(key, false);
    }
  },
  
  // Method PUT dengan penanganan loading dan error
  put: async <T,>(url: string, data: any, key: string): Promise<T> => {
    get().setLoading(key, true);
    try {
      const response = await api.put(url, data);
      get().setError(key, null);
      return response.data as T;
    } catch (error) {
      get().setError(key, error);
      throw error;
    } finally {
      get().setLoading(key, false);
    }
  },
  
  // Method DELETE dengan penanganan loading dan error
  delete: async <T,>(url: string, key: string): Promise<T> => {
    get().setLoading(key, true);
    try {
      const response = await api.delete(url);
      get().setError(key, null);
      return response.data as T;
    } catch (error) {
      get().setError(key, error);
      throw error;
    } finally {
      get().setLoading(key, false);
    }
  },
})); 