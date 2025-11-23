/**
 * Admin Controller для управления треками и плейлистами
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { parseLRC } from '../utils/lrc-parser';
import path from 'path';
import fs from 'fs';

// Получить статистику админа
export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [tracksCount, playlistsCount, usersCount, totalPlays] = await Promise.all([
      prisma.track.count(),
      prisma.playlist.count(),
      prisma.user.count(),
      prisma.track.aggregate({
        _sum: { playsCount: true }
      })
    ]);

    res.json({
      tracks: tracksCount,
      playlists: playlistsCount,
      users: usersCount,
      totalPlays: totalPlays._sum.playsCount || 0
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    next(error);
  }
};

// Загрузка одного трека
export const uploadTrack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, artist, album, genre, duration } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const userId = (req as any).user.id;

    // Проверяем обязательные поля
    if (!title || !artist) {
      return res.status(400).json({ message: 'Title and artist are required' });
    }

    // Обрабатываем файлы
    const audioFile = files.audioFile?.[0];
    const coverFile = files.coverFile?.[0];
    const lyricsFile = files.lyricsFile?.[0];

    let audioPath = null;
    let coverPath = null;
    let lyricsPath = null;
    let lyrics = null;

    if (audioFile) {
      audioPath = `storage/tracks/${audioFile.filename}`;
    }

    if (coverFile) {
      coverPath = `storage/covers/${coverFile.filename}`;
    }

    if (lyricsFile) {
      lyricsPath = `storage/lyrics/${lyricsFile.filename}`;
      
      // Парсим LRC файл если это .lrc
      if (lyricsFile.originalname.endsWith('.lrc')) {
        const lrcContent = fs.readFileSync(lyricsFile.path, 'utf-8');
        const parsedLyrics = parseLRC(lrcContent);
        lyrics = parsedLyrics.lines;
      }
    }

    // Создаем трек в базе данных
    const track = await prisma.track.create({
      data: {
        title,
        artist,
        album: album || null,
        genre: genre || null,
        duration: parseInt(duration) || 0,
        audioUrl: audioPath ? `/api/tracks/file/audio/${path.basename(audioPath)}` : null,
        audioPath,
        coverUrl: coverPath ? `/api/tracks/file/cover/${path.basename(coverPath)}` : null,
        coverPath,
        lyricsPath,
        lyrics: lyrics as any,
        uploadedById: userId,
      }
    });

    logger.info(`Track uploaded: ${track.title} by ${track.artist}`);
    res.status(201).json({ message: 'Track uploaded successfully', track });
  } catch (error) {
    logger.error('Error uploading track:', error);
    next(error);
  }
};

// Массовая загрузка треков
export const bulkUploadTracks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tracksData } = req.body; // JSON с данными треков
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const userId = (req as any).user.id;

    const tracks = JSON.parse(tracksData);
    const uploadedTracks = [];

    for (const trackData of tracks) {
      const { title, artist, album, genre, duration } = trackData;
      
      // Ищем соответствующие файлы
      const audioFile = files.audioFiles?.find(f => f.originalname.includes(title));
      const coverFile = files.coverFiles?.find(f => f.originalname.includes(title));
      const lyricsFile = files.lyricsFiles?.find(f => f.originalname.includes(title));

      let audioPath = null;
      let coverPath = null;
      let lyricsPath = null;
      let lyrics = null;

      if (audioFile) {
        audioPath = `storage/tracks/${audioFile.filename}`;
      }

      if (coverFile) {
        coverPath = `storage/covers/${coverFile.filename}`;
      }

      if (lyricsFile) {
        lyricsPath = `storage/lyrics/${lyricsFile.filename}`;
        
        if (lyricsFile.originalname.endsWith('.lrc')) {
          const lrcContent = fs.readFileSync(lyricsFile.path, 'utf-8');
          const parsedLyrics = parseLRC(lrcContent);
          lyrics = parsedLyrics.lines;
        }
      }

      const track = await prisma.track.create({
        data: {
          title,
          artist,
          album: album || null,
          genre: genre || null,
          duration: parseInt(duration) || 0,
          audioUrl: audioPath ? `/api/tracks/file/audio/${path.basename(audioPath)}` : null,
          audioPath,
          coverUrl: coverPath ? `/api/tracks/file/cover/${path.basename(coverPath)}` : null,
          coverPath,
          lyricsPath,
          lyrics: lyrics as any,
          uploadedById: userId,
        }
      });

      uploadedTracks.push(track);
    }

    logger.info(`Bulk upload completed: ${uploadedTracks.length} tracks`);
    res.status(201).json({ 
      message: 'Bulk upload completed successfully', 
      tracks: uploadedTracks,
      count: uploadedTracks.length
    });
  } catch (error) {
    logger.error('Error in bulk upload:', error);
    next(error);
  }
};

// Создание плейлиста
export const uploadPlaylist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, isPublic, trackIds } = req.body;
    const coverFile = req.file;
    const userId = (req as any).user.id;

    if (!title) {
      return res.status(400).json({ message: 'Playlist title is required' });
    }

    let coverPath = null;
    if (coverFile) {
      coverPath = `storage/covers/${coverFile.filename}`;
    }

    // Создаем плейлист
    const playlist = await prisma.playlist.create({
      data: {
        title,
        description: description || null,
        coverUrl: coverPath ? `/api/tracks/file/cover/${path.basename(coverPath)}` : null,
        isPublic: isPublic === 'true',
        ownerId: userId,
      }
    });

    // Добавляем треки в плейлист если указаны
    if (trackIds && Array.isArray(trackIds)) {
      const playlistTracks = trackIds.map((trackId: string, index: number) => ({
        playlistId: playlist.id,
        trackId,
        position: index + 1,
      }));

      await prisma.playlistTrack.createMany({
        data: playlistTracks,
      });
    }

    logger.info(`Playlist created: ${playlist.title}`);
    res.status(201).json({ message: 'Playlist created successfully', playlist });
  } catch (error) {
    logger.error('Error creating playlist:', error);
    next(error);
  }
};

// Обновление трека
export const updateTrack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, artist, album, genre, duration } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const track = await prisma.track.findUnique({
      where: { id }
    });

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // Обновляем только переданные поля
    const updateData: any = {};
    if (title) updateData.title = title;
    if (artist) updateData.artist = artist;
    if (album !== undefined) updateData.album = album;
    if (genre !== undefined) updateData.genre = genre;
    if (duration) updateData.duration = parseInt(duration);

    // Обрабатываем новые файлы
    const audioFile = files.audioFile?.[0];
    const coverFile = files.coverFile?.[0];
    const lyricsFile = files.lyricsFile?.[0];

    if (audioFile) {
      updateData.audioPath = `storage/tracks/${audioFile.filename}`;
      updateData.audioUrl = `/api/tracks/file/audio/${path.basename(audioFile.filename)}`;
    }

    if (coverFile) {
      updateData.coverPath = `storage/covers/${coverFile.filename}`;
      updateData.coverUrl = `/api/tracks/file/cover/${path.basename(coverFile.filename)}`;
    }

    if (lyricsFile) {
      updateData.lyricsPath = `storage/lyrics/${lyricsFile.filename}`;
      
      if (lyricsFile.originalname.endsWith('.lrc')) {
        const lrcContent = fs.readFileSync(lyricsFile.path, 'utf-8');
        const parsedLyrics = parseLRC(lrcContent);
        updateData.lyrics = parsedLyrics.lines;
      }
    }

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: updateData
    });

    logger.info(`Track updated: ${updatedTrack.title}`);
    res.json({ message: 'Track updated successfully', track: updatedTrack });
  } catch (error) {
    logger.error('Error updating track:', error);
    next(error);
  }
};

// Удаление трека
export const deleteTrack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id }
    });

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // Удаляем файлы с диска
    if (track.audioPath) {
      const audioFilePath = path.join(__dirname, '../../', track.audioPath);
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
    }

    if (track.coverPath) {
      const coverFilePath = path.join(__dirname, '../../', track.coverPath);
      if (fs.existsSync(coverFilePath)) {
        fs.unlinkSync(coverFilePath);
      }
    }

    if (track.lyricsPath) {
      const lyricsFilePath = path.join(__dirname, '../../', track.lyricsPath);
      if (fs.existsSync(lyricsFilePath)) {
        fs.unlinkSync(lyricsFilePath);
      }
    }

    // Удаляем из базы данных
    await prisma.track.delete({
      where: { id }
    });

    logger.info(`Track deleted: ${track.title}`);
    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    logger.error('Error deleting track:', error);
    next(error);
  }
};
