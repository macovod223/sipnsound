/**
 * API Client для Sip&Sound
 * Подключение к бэкенду Node.js
 */

import { config } from '../config/env';

const API_BASE_URL = config.apiUrl;

export interface Track {
  id: string;
  title: string;
  artistName: string;
  albumName?: string;
  genre?: string;
  duration: number;
  audioUrl: string;
  audioPath?: string;
  coverUrl?: string;
  coverPath?: string;
  lyricsPath?: string;
  lyrics?: any;
  playsCount: number;
  uploadedBy?: {
    id: string;
    username: string;
  };
  // Для обратной совместимости
  artist?: string;
  album?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Аутентификация
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    
    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Треки
  async getTracks(params?: {
    genre?: string;
    artist?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tracks: Track[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.genre) queryParams.append('genre', params.genre);
    if (params?.artist) queryParams.append('artist', params.artist);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request<{ tracks: Track[]; pagination: any }>(
      `/api/tracks${query ? `?${query}` : ''}`
    );
  }

  async getTrackById(id: string): Promise<{ track: Track; isLiked: boolean }> {
    return this.request<{ track: Track; isLiked: boolean }>(`/api/tracks/${id}`);
  }

  async getTrackStreamUrl(id: string): Promise<{ url: string; title: string; artist: string; isLocal: boolean }> {
    return this.request<{ url: string; title: string; artist: string; isLocal: boolean }>(`/api/tracks/${id}/stream`);
  }

  async getTrackLyrics(id: string): Promise<{ lyrics: any; source?: string }> {
    return this.request<{ lyrics: any; source?: string }>(`/api/tracks/${id}/lyrics`);
  }

  // Плейлисты
  async getPlaylists(): Promise<Playlist[]> {
    return this.request<Playlist[]>('/api/playlists');
  }

  async getPlaylistById(id: string): Promise<Playlist> {
    return this.request<Playlist>(`/api/playlists/${id}`);
  }

  // Пользователи
  async getUserProfile(id: string): Promise<User> {
    return this.request<User>(`/api/users/${id}`);
  }

  // Проверка подключения к API
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Утилита для получения полного URL файла
  getFileUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.baseUrl}${path}`;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
