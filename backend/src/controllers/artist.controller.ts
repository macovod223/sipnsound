/**
 * Artist Controller для управления артистами
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

// Получить всех артистов
export const getArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artists = await prisma.artist.findMany({
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
export const getArtistById = async (req: Request, res: Response, next: NextFunction) => {
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
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json(artist);
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

// Создать артиста
export const createArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, verified } = req.body;
    const imageFile = req.file;

    if (!name) {
      return res.status(400).json({ message: 'Artist name is required' });
    }

    // Проверяем, не существует ли уже артист с таким именем
    const existingArtist = await prisma.artist.findUnique({
      where: { name },
    });

    if (existingArtist) {
      return res.status(400).json({ message: 'Artist with this name already exists' });
    }

    let imagePath = null;
    let imageUrl = null;

    if (imageFile) {
      imagePath = `storage/artists/${imageFile.filename}`;
      imageUrl = `/api/artists/image/${path.basename(imageFile.filename)}`;
    }

    const artist = await prisma.artist.create({
      data: {
        name,
        bio: bio || null,
        imageUrl,
        imagePath,
        verified: verified === 'true' || verified === true,
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
export const updateArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, bio, verified } = req.body;
    const imageFile = req.file;

    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    // Проверяем, не существует ли уже другой артист с таким именем
    if (name && name !== artist.name) {
      const existingArtist = await prisma.artist.findUnique({
        where: { name },
      });

      if (existingArtist) {
        return res.status(400).json({ message: 'Artist with this name already exists' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (verified !== undefined) updateData.verified = verified === 'true' || verified === true;

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
export const deleteArtist = async (req: Request, res: Response, next: NextFunction) => {
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
      return res.status(404).json({ message: 'Artist not found' });
    }

    // Проверяем, есть ли связанные треки или альбомы
    if (artist.tracks.length > 0 || artist.albums.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete artist with existing tracks or albums. Please delete all tracks and albums first.' 
      });
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
