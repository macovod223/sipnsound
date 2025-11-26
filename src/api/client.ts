/**
 * API Client для Sip&Sound
 * Подключение к бэкенду Node.js
 */

import { config } from '../config/env';

const API_BASE_URL = config.apiUrl;

export interface Track {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  audioPath?: string;
  coverUrl?: string;
  coverPath?: string;
  lyricsPath?: string;
  lyrics?: any;
  playsCount?: number;
  isExplicit: boolean;
  isPublished: boolean;
  // Связи с другими сущностями
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
    verified?: boolean;
  };
  album?: {
    id: string;
    title: string;
    year?: number;
    coverUrl?: string;
  };
  genre?: {
    id: string;
    name: string;
    color?: string;
  };
  uploadedBy?: {
    id: string;
    username: string;
  };
  createdAt?: string;
  updatedAt?: string;
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
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tracks: number;
  };
}

export interface PlaylistDetails extends Playlist {
  tracks?: Array<{
    id: string;
    position: number;
    track: Track;
  }>;
}

export interface ArtistSummary {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  imagePath?: string;
  verified?: boolean;
  monthlyListeners?: number;
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
    const headers = new Headers(options.headers || {});
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
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
    const response = await this.request<{ user: User }>('/api/auth/me');
    return response.user;
  }

  async updateCurrentUser(data: {
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  }): Promise<User> {
    const response = await this.request<{ user: User }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.user;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Треки
  async getTracks(params?: {
    genreId?: string;
    artistId?: string;
    albumId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    includeAll?: boolean;
  }): Promise<{ tracks: Track[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.genreId) queryParams.append('genreId', params.genreId);
    if (params?.artistId) queryParams.append('artistId', params.artistId);
    if (params?.albumId) queryParams.append('albumId', params.albumId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.includeAll) queryParams.append('includeAll', 'true');
    
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

  async likeTrack(id: string): Promise<{ message: string; isLiked: boolean }> {
    return this.request<{ message: string; isLiked: boolean }>(`/api/tracks/${id}/like`, {
      method: 'POST',
    });
  }

  async unlikeTrack(id: string): Promise<{ message: string; isLiked: boolean }> {
    return this.request<{ message: string; isLiked: boolean }>(`/api/tracks/${id}/like`, {
      method: 'DELETE',
    });
  }

  async getLikedTracks(): Promise<{ tracks: Track[] }> {
    return this.request<{ tracks: Track[] }>('/api/users/me/liked-tracks');
  }

  // Плейлисты
  async getPlaylists(): Promise<Playlist[]> {
    const response = await this.request<{ playlists: Playlist[] }>('/api/playlists');
    return response.playlists;
  }

  async getPlaylistById(id: string): Promise<PlaylistDetails & { tracks?: Array<{ track: Track; position: number }> }> {
    const response = await this.request<{ playlist: PlaylistDetails & { tracks?: Array<{ track: Track; position: number }> } }>(`/api/playlists/${id}`);
    return response.playlist;
  }

  async createPlaylist(formData: FormData): Promise<{ playlist: Playlist }> {
    return this.request<{ playlist: Playlist }>('/api/playlists', {
      method: 'POST',
      body: formData,
    });
  }

  async updatePlaylist(id: string, formData: FormData): Promise<{ playlist: Playlist }> {
    return this.request<{ playlist: Playlist }>(`/api/playlists/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    await this.request(`/api/playlists/${id}`, {
      method: 'DELETE',
    });
  }

  // Пользователи
  async getUserProfile(id: string): Promise<User> {
    return this.request<User>(`/api/users/${id}`);
  }

  // Артисты
  async getArtists(params?: { search?: string; limit?: number }): Promise<ArtistSummary[]> {
    const queryParams = new URLSearchParams();
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    const query = queryParams.toString();
    return this.request<ArtistSummary[]>(`/api/artists${query ? `?${query}` : ''}`);
  }

  async createArtist(formData: FormData): Promise<{ artist: ArtistSummary }> {
    return this.request<{ artist: ArtistSummary }>('/api/artists', {
      method: 'POST',
      body: formData,
    });
  }

  async updateArtist(id: string, formData: FormData): Promise<{ artist: ArtistSummary }> {
    return this.request<{ artist: ArtistSummary }>(`/api/artists/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async deleteArtist(id: string): Promise<void> {
    await this.request(`/api/artists/${id}`, {
      method: 'DELETE',
    });
  }

  async getArtistById(id: string): Promise<any> {
    return this.request(`/api/artists/${id}`);
  }

  async getArtistTracks(id: string, params?: { page?: number; limit?: number }): Promise<{ tracks: Track[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return this.request<{ tracks: Track[]; pagination: any }>(`/api/artists/${id}/tracks${query ? `?${query}` : ''}`);
  }

  async followArtist(artistId: string): Promise<void> {
    await this.request(`/api/artists/${artistId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowArtist(artistId: string): Promise<void> {
    await this.request(`/api/artists/${artistId}/follow`, {
      method: 'DELETE',
    });
  }

  async checkFollowing(artistId: string): Promise<{ isFollowing: boolean }> {
    return this.request<{ isFollowing: boolean }>(`/api/artists/${artistId}/follow`);
  }

  async getFollowingArtists(): Promise<ArtistSummary[]> {
    return this.request<ArtistSummary[]>('/api/users/me/following');
  }

  async getAlbums(params?: { search?: string; artistId?: string; limit?: number }): Promise<Array<{
    id: string;
    title: string;
    year?: number;
    type: 'album' | 'single';
    coverUrl?: string;
    coverPath?: string;
    artist: {
      id: string;
      name: string;
    };
    _count: {
      tracks: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.artistId) queryParams.append('artistId', params.artistId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return this.request<Array<{
      id: string;
      title: string;
      year?: number;
      type: 'album' | 'single';
      coverUrl?: string;
      coverPath?: string;
      artist: {
        id: string;
        name: string;
      };
      _count: {
        tracks: number;
      };
    }>>(`/api/artists/albums${query ? `?${query}` : ''}`);
  }

  async updateAlbum(id: string, formData: FormData): Promise<{ album: any }> {
    return this.request<{ album: any }>(`/api/artists/albums/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  // Админ-треки
  async getAdminTracks(params?: { search?: string; page?: number; limit?: number; isPublished?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isPublished !== undefined) queryParams.append('isPublished', String(params.isPublished));
    if (params?.search) queryParams.append('search', params.search);
    const query = queryParams.toString();
    return this.request<{ tracks: Track[]; pagination: any }>(
      `/api/admin/tracks${query ? `?${query}` : ''}`
    );
  }

  async getStats(): Promise<{ tracks: number; playlists: number; users: number; totalPlays: number }> {
    return this.request<{ tracks: number; playlists: number; users: number; totalPlays: number }>('/api/admin/stats');
  }

  async createTrack(formData: FormData): Promise<{ track: Track }> {
    return this.request<{ track: Track }>('/api/admin/tracks', {
      method: 'POST',
      body: formData,
    });
  }

  async updateTrack(id: string, formData: FormData): Promise<{ track: Track }> {
    return this.request<{ track: Track }>(`/api/admin/tracks/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async deleteTrack(id: string): Promise<void> {
    await this.request(`/api/admin/tracks/${id}`, {
      method: 'DELETE',
    });
  }

  // Проверка подключения к API
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Утилита для получения полного URL файла
  getFileUrl(path: string): string {
    if (!path) {
      return '';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
