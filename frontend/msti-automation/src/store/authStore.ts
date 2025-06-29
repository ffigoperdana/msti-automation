import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (serverAddress: string, serverPort: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (serverAddress: string, serverPort: string, username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const apiUrl = `http://${serverAddress}:${serverPort}/api/auth/login`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            set({ 
              user: data.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            throw new Error(data.message || 'Login failed');
          }
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          // Get server config from localStorage
          const serverAddress = localStorage.getItem('ip_host') || '192.168.238.10';
          const serverPort = localStorage.getItem('port') || '3001';
          const apiUrl = `http://${serverAddress}:${serverPort}/api/auth/logout`;
          
          await fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        
        try {
          // Get server config from localStorage
          const serverAddress = localStorage.getItem('ip_host');
          const serverPort = localStorage.getItem('port');
          
          if (!serverAddress || !serverPort) {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            return;
          }

          const apiUrl = `http://${serverAddress}:${serverPort}/api/auth/session`;
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
          });

          const data = await response.json();

          if (response.ok && data.success) {
            set({ 
              user: data.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('Session check error:', error);
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore; 