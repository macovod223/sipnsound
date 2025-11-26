/**
 * Artist Controller для управления артистами
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

// Получить всех артистов
export const getArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const artists = await prisma.artist.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      take: Number.isFinite(limit) ? limit : undefined,
      select: {
        id: true,
        name: true,
        bio: true,
        imageUrl: true,
        imagePath: true,
        verified: true,
        monthlyListeners: true,
        createdAt: true,
        _count: {
          select: {
            tracks: true,
            albums: true,
          },
        },
      },
      orderBy: {
        monthlyListeners: 'desc',
      },
    });

    res.json(artists);
  } catch (error) {
    logger.error('Error fetching artists:', error);
    next(error);
  }
};

// Получить артиста по ID
export const getArtistById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        tracks: {
          select: {
            id: true,
            title: true,
            duration: true,
            playsCount: true,
            coverUrl: true,
            coverPath: true,
            audioUrl: true,
            audioPath: true,
          },
          orderBy: {
            playsCount: 'desc',
          },
          take: 10, // Топ 10 треков
        },
        albums: {
          select: {
            id: true,
            title: true,
            year: true,
            type: true,
            coverUrl: true,
            coverPath: true,
            _count: {
              select: {
                tracks: true,
              },
            },
          },
          orderBy: {
            year: 'desc',
          },
        },
      },
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const formatTrackMedia = (track: any) => ({
      ...track,
      coverUrl: track.coverPath
        ? `/api/tracks/file/cover/${path.basename(track.coverPath)}`
        : track.coverUrl,
      audioUrl: track.audioPath
        ? `/api/tracks/file/audio/${path.basename(track.audioPath)}`
        : track.audioUrl,
    });

    const formatAlbumCover = (album: any) => ({
      ...album,
      coverUrl: album.coverPath
        ? `/api/tracks/file/cover/${path.basename(album.coverPath)}`
        : album.coverUrl,
    });

    const formattedArtist = {
      ...artist,
      tracks: (artist.tracks ?? []).map(formatTrackMedia),
      albums: (artist.albums ?? []).map(formatAlbumCover),
    };

    res.json(formattedArtist);
  } catch (error) {
    logger.error(`Error fetching artist ${req.params.id}:`, error);
    next(error);
  }
};

// Получить треки артиста
export const getArtistTracks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const tracks = await prisma.track.findMany({
      where: { artistId: id },
      select: {
        id: true,
        title: true,
        duration: true,
        playsCount: true,
        coverUrl: true,
        coverPath: true,
        album: true,
        genre: true,
      },
      orderBy: {
        playsCount: 'desc',
      },
      skip,
      take: Number(limit),
    });

    const total = await prisma.track.count({
      where: { artistId: id },
    });

    res.json({
      tracks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error(`Error fetching tracks for artist ${req.params.id}:`, error);
    next(error);
  }
};

// Получить альбомы артиста
export const getArtistAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const albums = await prisma.album.findMany({
      where: { artistId: id },
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        coverUrl: true,
        coverPath: true,
        _count: {
          select: {
            tracks: true,
          },
        },
      },
      orderBy: {
        year: 'desc',
      },
    });

    res.json(albums);
  } catch (error) {
    logger.error(`Error fetching albums for artist ${req.params.id}:`, error);
    next(error);
  }
};

// Получить все альбомы (для админ-панели)
export const getAllAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const artistId = typeof req.query.artistId === 'string' ? req.query.artistId.trim() : '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const albums = await prisma.album.findMany({
      where: {
        ...(search ? {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        } : {}),
        ...(artistId ? { artistId } : {}),
      },
      take: Number.isFinite(limit) ? limit : undefined,
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        coverUrl: true,
        coverPath: true,
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tracks: true,
          },
        },
      },
      orderBy: {
        year: 'desc',
      },
    });

    res.json(albums);
  } catch (error) {
    logger.error('Error fetching albums:', error);
    next(error);
  }
};

// Обновить альбом
export const updateAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, year, type, coverUrl, coverPath } = req.body;
    const coverFile = req.file;

    const album = await prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      res.status(404).json({ message: 'Album not found' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (year !== undefined) {
      const parsedYear = parseInt(String(year), 10);
      if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= new Date().getFullYear() + 1) {
        updateData.year = parsedYear;
      }
    }
    if (type && (type === 'album' || type === 'single')) {
      updateData.type = type;
    }

    // Обрабатываем новую обложку
    if (coverFile) {
      // Удаляем старую обложку если есть
      if (album.coverPath) {
        const oldCoverPath = path.join(__dirname, '../../', album.coverPath);
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }

      updateData.coverPath = `storage/covers/${coverFile.filename}`;
      updateData.coverUrl = `/api/tracks/file/cover/${coverFile.filename}`;
    } else if (coverUrl !== undefined) {
      updateData.coverUrl = coverUrl ? String(coverUrl).trim() : null;
    }
    if (coverPath !== undefined) {
      updateData.coverPath = coverPath ? String(coverPath).trim() : null;
    }

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: updateData,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tracks: true,
          },
        },
      },
    });

    logger.info(`Album updated: ${updatedAlbum.title}`);
    res.json({ message: 'Album updated successfully', album: updatedAlbum });
  } catch (error) {
    logger.error(`Error updating album ${req.params.id}:`, error);
    next(error);
  }
};

const ARTIST_STORAGE_DIR = path.resolve(__dirname, '../../storage/artists');

// Стриминг изображения артиста
export const getArtistImage = (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const imagePath = path.resolve(ARTIST_STORAGE_DIR, safeFilename);

  if (!imagePath.startsWith(ARTIST_STORAGE_DIR)) {
    res.status(400).json({ message: 'Invalid file path' });
    return;
  }

  if (!fs.existsSync(imagePath)) {
    res.status(404).json({ message: 'Image not found' });
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
  stream.on('error', (error) => {
    logger.error('Error streaming artist image:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to stream artist image' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
};

// Создать артиста
export const createArtist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, bio, verified, monthlyListeners } = req.body;
    const imageFile = req.file;

    if (!name) {
      res.status(400).json({ message: 'Artist name is required' });
      return;
    }

    // Проверяем, не существует ли уже артист с таким именем
    const existingArtist = await prisma.artist.findUnique({
      where: { name },
    });

    if (existingArtist) {
      res.status(400).json({ message: 'Artist with this name already exists' });
      return;
    }

    let imagePath = null;
    let imageUrl = null;

    if (imageFile) {
      imagePath = `storage/artists/${imageFile.filename}`;
      imageUrl = `/api/artists/image/${path.basename(imageFile.filename)}`;
    }

    const parsedMonthly =
      monthlyListeners !== undefined && monthlyListeners !== null && monthlyListeners !== ''
        ? Math.max(0, Math.floor(Number(String(monthlyListeners).replace(/[\s,]/g, ''))) || 0)
        : 0;

    const artist = await prisma.artist.create({
      data: {
        name,
        bio: bio || null,
        imageUrl,
        imagePath,
        verified: verified === 'true' || verified === true,
        monthlyListeners: parsedMonthly,
      },
    });

    logger.info(`Artist created: ${artist.name}`);
    res.status(201).json({ message: 'Artist created successfully', artist });
  } catch (error) {
    logger.error('Error creating artist:', error);
    next(error);
  }
};

// Обновить артиста
export const updateArtist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, bio, verified, monthlyListeners } = req.body;
    const imageFile = req.file;

    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    // Проверяем, не существует ли уже другой артист с таким именем
    if (name && name !== artist.name) {
      const existingArtist = await prisma.artist.findUnique({
        where: { name },
      });

      if (existingArtist) {
        res.status(400).json({ message: 'Artist with this name already exists' });
        return;
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (verified !== undefined) updateData.verified = verified === 'true' || verified === true;
    if (monthlyListeners !== undefined) {
      const parsedMonthly = Math.max(0, Math.floor(Number(String(monthlyListeners).replace(/[\s,]/g, ''))) || 0);
      updateData.monthlyListeners = parsedMonthly;
    }

    // Обрабатываем новое изображение
    if (imageFile) {
      // Удаляем старое изображение если есть
      if (artist.imagePath) {
        const oldImagePath = path.join(__dirname, '../../', artist.imagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      updateData.imagePath = `storage/artists/${imageFile.filename}`;
      updateData.imageUrl = `/api/artists/image/${path.basename(imageFile.filename)}`;
    }

    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Artist updated: ${updatedArtist.name}`);
    res.json({ message: 'Artist updated successfully', artist: updatedArtist });
  } catch (error) {
    logger.error('Error updating artist:', error);
    next(error);
  }
};

// Удалить артиста
export const deleteArtist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        tracks: true,
        albums: true,
      },
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    // Проверяем, есть ли связанные треки или альбомы
    if (artist.tracks.length > 0 || artist.albums.length > 0) {
      res.status(400).json({ 
        message: 'Cannot delete artist with existing tracks or albums. Please delete all tracks and albums first.' 
      });
      return;
    }

    // Удаляем изображение если есть
    if (artist.imagePath) {
      const imagePath = path.join(__dirname, '../../', artist.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Удаляем артиста из базы данных
    await prisma.artist.delete({
      where: { id },
    });

    logger.info(`Artist deleted: ${artist.name}`);
    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    logger.error('Error deleting artist:', error);
    next(error);
  }
};

// Подписаться на артиста
export const followArtist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      throw new AppError('Artist not found', 404);
    }

    // Проверяем, не подписан ли уже
    const existingFollow = await prisma.following.findUnique({
      where: {
        userId_artistId: {
          userId: req.user.id,
          artistId: id,
        },
      },
    });

    if (existingFollow) {
      throw new AppError('Already following this artist', 400);
    }

    await prisma.following.create({
      data: {
        userId: req.user.id,
        artistId: id,
      },
    });

    res.json({ message: 'Successfully followed artist' });
  }
);

// Отписаться от артиста
export const unfollowArtist = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      throw new AppError('Artist not found', 404);
    }

    await prisma.following.deleteMany({
      where: {
        userId: req.user.id,
        artistId: id,
      },
    });

    res.json({ message: 'Successfully unfollowed artist' });
  }
);

// Проверить, подписан ли пользователь на артиста
export const checkFollowing = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.json({ isFollowing: false });
      return;
    }

    const { id } = req.params;

    const following = await prisma.following.findUnique({
      where: {
        userId_artistId: {
          userId: req.user.id,
          artistId: id,
        },
      },
    });

    res.json({ isFollowing: !!following });
  }
);
