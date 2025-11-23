/**
 * AuthContext с интеграцией API
 */

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiClient, User } from '../api/client';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (username: string, avatar?: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Check for saved session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.log('No valid session found');
        apiClient.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.login(username, password);
      setUser(response.user);
      
      if (rememberMe) {
        localStorage.setItem('sipsound_remember', 'true');
      } else {
        localStorage.removeItem('sipsound_remember');
      }
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.register(username, email, password);
      setUser(response.user);
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    localStorage.removeItem('sipsound_remember');
  };

  const updateProfile = (username: string, avatar?: string) => {
    if (user) {
      setUser({
        ...user,
        username,
        avatarUrl: avatar,
      });
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
