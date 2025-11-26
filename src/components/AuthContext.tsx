import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient, User } from '../api/client';

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, rememberMe: boolean) => Promise<AuthResult>;
  register: (username: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  updateProfile: (profile: { username?: string; displayName?: string; avatarUrl?: string | null }) => Promise<AuthResult>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REMEMBER_KEY = 'sipsound_remember';
const SNAPSHOT_KEY = 'sipsound_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistUserSnapshot = useCallback((nextUser: User, remember: boolean) => {
    if (remember) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextUser));
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      // Если remember me выключен, удаляем все данные при следующем обновлении
      localStorage.setItem(REMEMBER_KEY, 'false');
      // Не удаляем токен сразу, чтобы пользователь мог работать в текущей сессии
      // Токен будет удален при следующем обновлении страницы
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const remember = localStorage.getItem(REMEMBER_KEY) === 'true';
      const cachedUser = localStorage.getItem(SNAPSHOT_KEY);

      // Если remember me не включен, удаляем токен и пользователя
      if (!remember) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem(SNAPSHOT_KEY);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Если remember me включен, восстанавливаем сессию
      if (remember && cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser) as User;
          if (isMounted) {
            setUser(parsedUser);
          }
        } catch {
          localStorage.removeItem(SNAPSHOT_KEY);
        }
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await apiClient.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          if (remember) {
            localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(currentUser));
          }
        }
      } catch (err) {
        console.error('Failed to restore session', err);
        apiClient.logout();
        localStorage.removeItem(SNAPSHOT_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean): Promise<AuthResult> => {
      try {
        setError(null);
        const response = await apiClient.login(username, password);
        setUser(response.user);
        persistUserSnapshot(response.user, rememberMe);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось выполнить вход';
        setError(message);
        return { success: false, message };
      }
    },
    [persistUserSnapshot]
  );

  const register = useCallback(
    async (username: string, email: string, password: string): Promise<AuthResult> => {
      try {
        setError(null);
        const response = await apiClient.register(username, email, password);
        setUser(response.user);
        // После регистрации сохраняем сессии по умолчанию
        persistUserSnapshot(response.user, true);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось выполнить регистрацию';
        setError(message);
        return { success: false, message };
      }
    },
    [persistUserSnapshot]
  );

  const logout = useCallback(() => {
    apiClient.logout();
    setUser(null);
    localStorage.removeItem(SNAPSHOT_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    setError(null);
  }, []);

  const updateProfile = useCallback(
    async (profile: { username?: string; displayName?: string; avatarUrl?: string | null }): Promise<AuthResult> => {
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      try {
        setError(null);
        const updatedUser = await apiClient.updateCurrentUser(profile);
        setUser(updatedUser);

        if (localStorage.getItem(REMEMBER_KEY) === 'true') {
          localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(updatedUser));
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось обновить профиль';
        setError(message);
        return { success: false, message };
      }
    },
    [user]
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
