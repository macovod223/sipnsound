import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

// GET /api/playlists
export const getPlaylists = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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
  async (req: Request, res: Response, next: NextFunction) => {
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
                artist: true,
                album: true,
                genre: true,
                duration: true,
                coverUrl: true,
                playsCount: true,
              },
            },
          },
          orderBy: { position: 'asc' },
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
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { title, description, coverUrl, isPublic = true } = req.body;

    if (!title || title.trim().length === 0) {
      throw new AppError('Title is required', 400);
    }

    const playlist = await prisma.playlist.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        coverUrl,
        isPublic,
        userId: req.user.id,
      },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    });

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist,
    });
  }
);

// PUT /api/playlists/:id
export const updatePlaylist = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { title, description, coverUrl, isPublic } = req.body;

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

    // Обновление
    const playlist = await prisma.playlist.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    res.json({
      message: 'Playlist updated successfully',
      playlist,
    });
  }
);

// DELETE /api/playlists/:id
export const deletePlaylist = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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

    // Удаление
    await prisma.playlist.delete({
      where: { id },
    });

    res.json({
      message: 'Playlist deleted successfully',
    });
  }
);

