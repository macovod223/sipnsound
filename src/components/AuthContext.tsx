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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple in-memory user database
const users: Record<string, string> = {
  '1': '1', // default user
  'admin': 'admin123', // admin user
  'testuser': 'testpass123', // test user
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved session on mount
  useEffect(() => {
    const rememberMe = localStorage.getItem('sipsound_remember') === 'true';
    const savedUser = localStorage.getItem('sipsound_user');
    
    if (rememberMe && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string, rememberMe: boolean): boolean => {
    // Check if user exists and password matches
    if (users[username] && users[username] === password) {
      const newUser: User = {
        username: username === '1' ? 'Music Lover' : username,
        avatar: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400',
      };
      setUser(newUser);
      
      if (rememberMe) {
        localStorage.setItem('sipsound_user', JSON.stringify(newUser));
        localStorage.setItem('sipsound_remember', 'true');
      } else {
        localStorage.removeItem('sipsound_user');
        localStorage.removeItem('sipsound_remember');
      }
      
      return true;
    }
    return false;
  };

  const register = (username: string, password: string): boolean => {
    // Check if user already exists
    if (users[username]) {
      return false;
    }
    
    // Register new user
    users[username] = password;
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sipsound_user');
    localStorage.removeItem('sipsound_remember');
  };

  const updateProfile = (username: string, avatar?: string) => {
    if (!user) return;
    
    const updatedUser: User = {
      username,
      avatar: avatar || user.avatar,
    };
    
    setUser(updatedUser);
    
    // Update localStorage if remember me is enabled
    const rememberMe = localStorage.getItem('sipsound_remember') === 'true';
    if (rememberMe) {
      localStorage.setItem('sipsound_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isAuthenticated: !!user, isLoading }}>
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
