/**
 * API Context для управления состоянием бэкенда
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, Track, User, Playlist } from './client';

interface ApiContextType {
  // Состояние
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Данные
  tracks: Track[];
  playlists: Playlist[];
  currentUser: User | null;
  
  // Методы
  loadTracks: () => Promise<void>;
  loadPlaylists: () => Promise<void>;
  loadUser: () => Promise<void>;
  checkConnection: () => Promise<void>;
  clearError: () => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const clearError = () => setError(null);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.healthCheck();
      setIsConnected(true);
      setError(null);
      console.log('✅ Backend connected:', response.message);
    } catch (err) {
      setIsConnected(false);
      setError('Backend не подключен. Запустите сервер: npm run dev в папке backend/');
      console.error('❌ Backend connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      const tracksData = await apiClient.getTracks();
      setTracks(tracksData);
      console.log('✅ Tracks loaded:', tracksData.length);
    } catch (err) {
      setError('Ошибка загрузки треков');
      console.error('❌ Failed to load tracks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      const playlistsData = await apiClient.getPlaylists();
      setPlaylists(playlistsData);
      console.log('✅ Playlists loaded:', playlistsData.length);
    } catch (err) {
      setError('Ошибка загрузки плейлистов');
      console.error('❌ Failed to load playlists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const userData = await apiClient.getCurrentUser();
      setCurrentUser(userData);
      console.log('✅ User loaded:', userData.username);
    } catch (err) {
      setError('Ошибка загрузки пользователя');
      console.error('❌ Failed to load user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка подключения при инициализации
  useEffect(() => {
    checkConnection();
  }, []);

  const value: ApiContextType = {
    isConnected,
    isLoading,
    error,
    tracks,
    playlists,
    currentUser,
    loadTracks,
    loadPlaylists,
    loadUser,
    checkConnection,
    clearError,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};
