import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  defaultTeamId?: string | null;
  teams?: Array<{
    teamId: string;
    role: string;
    name: string;
    slug: string;
  }>;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'pm_cursor_tokens';
const USER_KEY = 'pm_cursor_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedTokens = localStorage.getItem(TOKEN_KEY);
    
    if (storedUser && storedTokens) {
      setUser(JSON.parse(storedUser));
      // Set the auth header for API calls
      const tokens: AuthTokens = JSON.parse(storedTokens);
      api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      setToken(tokens.accessToken);
    }
    
    setIsLoading(false);
  }, []);

  const saveAuthData = (userData: User, tokens: AuthTokens) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    setUser(userData);
    setToken(tokens.accessToken);
  };

  const clearAuthData = () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, tokens } = response.data.data;
      saveAuthData(userData, tokens);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed';
      throw new Error(message);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { user: userData, tokens } = response.data.data;
      saveAuthData(userData, tokens);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    clearAuthData();
  };

  const refreshToken = async () => {
    try {
      const storedTokens = localStorage.getItem(TOKEN_KEY);
      if (!storedTokens) {
        throw new Error('No refresh token available');
      }

      const { refreshToken } = JSON.parse(storedTokens);
      const response = await api.post('/auth/refresh', { refreshToken });
      const { tokens } = response.data.data;
      
      // Update stored tokens
      const currentUser = user;
      if (currentUser) {
        saveAuthData(currentUser, tokens);
      }
    } catch (error) {
      // If refresh fails, logout user
      clearAuthData();
      throw error;
    }
  };

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            // Retry original request with new token
            const storedTokens = localStorage.getItem(TOKEN_KEY);
            if (storedTokens) {
              const { accessToken } = JSON.parse(storedTokens);
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            }
            return api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            clearAuthData();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        token,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
