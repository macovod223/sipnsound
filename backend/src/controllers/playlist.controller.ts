import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

const PLAYLIST_COVER_STORAGE_DIR = path.resolve(__dirname, '../../storage/playlist-covers');

const isLocalPlaylistCover = (coverUrl?: string | null) =>
  typeof coverUrl === 'string' && coverUrl.startsWith('/storage/playlist-covers/');

const deletePlaylistCover = (coverUrl?: string | null) => {
  if (!isLocalPlaylistCover(coverUrl)) {
    return;
  }
  const relativePath = coverUrl!.replace(/^\//, '');
  const absolutePath = path.resolve(__dirname, '../../', relativePath);
  if (absolutePath.startsWith(path.resolve(__dirname, '../../storage')) && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const parseBoolean = (value: any, defaultValue: boolean) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).toLowerCase();
  return normalized !== 'false' && normalized !== '0';
};

const parseTrackIds = (value: any): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((id) => typeof id === 'string' && id.trim().length > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((id) => typeof id === 'string' && id.trim().length > 0);
      }
    } catch {
      return value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }
  }
  return [];
};

// GET /api/playlists
export const getPlaylists = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const playlists = await prisma.playlist.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ playlists });
  }
);

// GET /api/playlists/:id
export const getPlaylistById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        tracks: {
          include: {
            track: {
              select: {
                id: true,
                title: true,
                duration: true,
                audioUrl: true,
                audioPath: true,
                coverUrl: true,
                coverPath: true,
                lyricsPath: true,
                playsCount: true,
                artist: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    verified: true,
                  },
                },
                album: {
                  select: {
                    id: true,
                    title: true,
                    year: true,
                    coverUrl: true,
                  },
                },
                genre: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { tracks: true },
        },
      },
    });

    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    // Проверка доступа (если плейлист приватный)
    if (!playlist.isPublic && (!req.user || req.user.id !== playlist.userId)) {
      throw new AppError('Access denied', 403);
    }

    res.json({ playlist });
  }
);

// POST /api/playlists
export const createPlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { title, description, coverUrl } = req.body;
    
    // FormData передает trackIds как строку JSON, нужно распарсить
    let trackIdsRaw = (req.body as any).trackIds;
    if (typeof trackIdsRaw === 'string') {
      try {
        trackIdsRaw = JSON.parse(trackIdsRaw);
      } catch {
        // Если не JSON, оставляем как есть
      }
    }
    const trackIds = parseTrackIds(trackIdsRaw);
    const normalizedTitle = title?.trim();

    if (!normalizedTitle || normalizedTitle.length === 0) {
      throw new AppError('Title is required', 400);
    }

    let resolvedCoverUrl =
      typeof coverUrl === 'string' && coverUrl.trim().length > 0 ? coverUrl.trim() : null;

    if (req.file) {
      resolvedCoverUrl = `/storage/playlist-covers/${req.file.filename}`;
    }

    const playlist = await prisma.playlist.create({
      data: {
        title: normalizedTitle,
        description: description?.trim() || null,
        coverUrl: resolvedCoverUrl,
        isPublic: parseBoolean((req.body as any).isPublic, true),
        userId: req.user.id,
      },
    });

    if (trackIds.length) {
      // Проверяем существование всех треков перед добавлением
      const existingTracks = await prisma.track.findMany({
        where: { id: { in: trackIds } },
        select: { id: true },
      });
      const existingTrackIds = new Set(existingTracks.map((t: { id: string }) => t.id));
      const invalidTrackIds = trackIds.filter(id => !existingTrackIds.has(id));
      
      if (invalidTrackIds.length > 0) {
        throw new AppError(
          `Some tracks not found: ${invalidTrackIds.join(', ')}`,
          400
        );
      }
      
      await prisma.playlistTrack.createMany({
        data: trackIds.map((trackId, index) => ({
          playlistId: playlist.id,
          trackId,
          position: index + 1,
        })),
        skipDuplicates: true,
      });
    }

    const playlistWithCount = await prisma.playlist.findUnique({
      where: { id: playlist.id },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    });

    if (!playlistWithCount) {
      throw new AppError('Failed to load playlist after creation', 500);
    }

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: playlistWithCount,
    });
  }
);

// PUT /api/playlists/:id
export const updatePlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { title, description, coverUrl, isPublic } = req.body;
    
    // FormData передает trackIds как строку JSON, нужно распарсить
    let trackIdsRaw = (req.body as any).trackIds;
    if (typeof trackIdsRaw === 'string') {
      try {
        trackIdsRaw = JSON.parse(trackIdsRaw);
      } catch {
        // Если не JSON, оставляем как есть
      }
    }
    const shouldUpdateTracks = trackIdsRaw !== undefined && trackIdsRaw !== null;
    const trackIds = shouldUpdateTracks ? parseTrackIds(trackIdsRaw) : [];

    // Проверка владельца
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!existingPlaylist) {
      throw new AppError('Playlist not found', 404);
    }

    if (existingPlaylist.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    const updateData: Record<string, any> = {};

    if (title !== undefined) {
      const normalized = title.trim();
      if (!normalized) {
        throw new AppError('Title cannot be empty', 400);
      }
      updateData.title = normalized;
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (coverUrl !== undefined && !req.file) {
      updateData.coverUrl = coverUrl?.trim()?.length ? coverUrl.trim() : null;
    }

    if (typeof isPublic !== 'undefined') {
      updateData.isPublic = parseBoolean(isPublic, existingPlaylist.isPublic);
    }

    if (req.file) {
      deletePlaylistCover(existingPlaylist.coverUrl);
      updateData.coverUrl = `/storage/playlist-covers/${req.file.filename}`;
    }

    await prisma.playlist.update({
      where: { id },
      data: updateData,
    });

    if (shouldUpdateTracks) {
      // Проверяем существование всех треков перед добавлением
      if (trackIds.length > 0) {
        const existingTracks = await prisma.track.findMany({
          where: { id: { in: trackIds } },
          select: { id: true },
        });
        const existingTrackIds = new Set(existingTracks.map((t: { id: string }) => t.id));
        const invalidTrackIds = trackIds.filter(id => !existingTrackIds.has(id));
        
        if (invalidTrackIds.length > 0) {
          throw new AppError(
            `Some tracks not found: ${invalidTrackIds.join(', ')}`,
            400
          );
        }
      }
      
      // Удаляем все существующие треки из плейлиста
      await prisma.playlistTrack.deleteMany({ where: { playlistId: id } });
      
      // Добавляем новые треки
      if (trackIds.length > 0) {
        await prisma.playlistTrack.createMany({
          data: trackIds.map((trackId, index) => ({
            playlistId: id,
            trackId,
            position: index + 1,
          })),
          skipDuplicates: true,
        });
      }
    }

    const playlistWithRelations = await prisma.playlist.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    });

    if (!playlistWithRelations) {
      throw new AppError('Playlist not found after update', 500);
    }

    res.json({
      message: 'Playlist updated successfully',
      playlist: playlistWithRelations,
    });
  }
);

// DELETE /api/playlists/:id
export const deletePlaylist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Проверка владельца
    const playlist = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    if (playlist.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    deletePlaylistCover(playlist.coverUrl);

    // Удаление
    await prisma.playlist.delete({
      where: { id },
    });

    res.json({
      message: 'Playlist deleted successfully',
    });
  }
);

// GET /api/playlists/file/cover/:filename
export const getPlaylistCover = (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const imagePath = path.resolve(PLAYLIST_COVER_STORAGE_DIR, safeFilename);

  // Защита от path traversal
  if (!imagePath.startsWith(PLAYLIST_COVER_STORAGE_DIR)) {
    res.status(400).json({ message: 'Invalid file path' });
    return;
  }

  if (!fs.existsSync(imagePath)) {
    res.status(404).json({ message: 'Cover image not found' });
    return;
  }

  const extension = path.extname(imagePath).toLowerCase();
  const contentType =
    extension === '.png'
      ? 'image/png'
      : extension === '.webp'
      ? 'image/webp'
      : 'image/jpeg';

  const stream = fs.createReadStream(imagePath);

  res.setHeader('Content-Type', contentType);
  stream.on('error', () => {
    // Логирование ошибок уже обрабатывается через Winston logger
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to stream playlist cover' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
};

