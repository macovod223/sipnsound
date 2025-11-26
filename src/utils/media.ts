import { apiClient } from '@/api/client';

const extractFileName = (input: string) => {
  const normalized = input.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || normalized;
};

const mapStoragePathToApi = (rawPath: string) => {
  const trimmed = rawPath.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/')) {
    return trimmed;
  }

  const fileName = extractFileName(trimmed);
  if (!fileName) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  if (trimmed.includes('storage/covers/')) {
    return `/api/tracks/file/cover/${fileName}`;
  }

  if (trimmed.includes('storage/tracks/')) {
    return `/api/tracks/file/audio/${fileName}`;
  }

  if (trimmed.includes('storage/artists/')) {
    return `/api/artists/image/${fileName}`;
  }
  
  // Добавляем обработку для обложек плейлистов
  if (trimmed.includes('storage/playlist-covers/')) {
    return `/api/playlists/file/cover/${fileName}`;
  }
  
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const resolveMediaUrl = (path?: string | null) => {
  if (!path) return undefined;

  const mapped = mapStoragePathToApi(path);
  if (!mapped) return undefined;

  // Если уже полный URL (http/https) - возвращаем как есть
  if (mapped.startsWith('http://') || mapped.startsWith('https://')) {
    return mapped;
  }

  // Если путь начинается с /api/ - возвращаем как есть (прокси обработает)
  if (mapped.startsWith('/api/')) {
    return mapped;
  }

  // Для остальных путей используем getFileUrl
  return apiClient.getFileUrl(mapped);
};

export const resolveImageUrl = (path?: string | null, fallback?: string) => {
  return resolveMediaUrl(path) || fallback;
};

export const resolveAudioUrl = (path?: string | null) => {
  return resolveMediaUrl(path);
};

