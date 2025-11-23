import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import { parseLrcFile } from '../utils/lrc-parser';

// GET /api/tracks
export const getTracks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { 
      genre, 
      artist, 
      search,
      page = '1', 
      limit = '20',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Построение фильтров
    const where: any = {};
    
    if (genre) {
      where.genre = genre;
    }
    
    if (artist) {
      where.artistName = { contains: artist as string, mode: 'insensitive' };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { artistName: { contains: search as string, mode: 'insensitive' } },
        { albumName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Получение треков
    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: order },
        select: {
          id: true,
          title: true,
          artistName: true,
          albumName: true,
          genre: true,
          duration: true,
          coverUrl: true,
          coverPath: true,
          playsCount: true,
          createdAt: true,
        },
      }),
      prisma.track.count({ where }),
    ]);

    // Формируем URL для обложек
    const tracksWithCovers = tracks.map(track => ({
      ...track,
      coverUrl: track.coverPath 
        ? `/api/tracks/file/cover/${path.basename(track.coverPath)}`
        : track.coverUrl,
    }));

    res.json({
      tracks: tracksWithCovers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);

// GET /api/tracks/:id
export const getTrackById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!track) {
      throw new AppError('Track not found', 404);
    }

    // Проверка лайка пользователем
    let isLiked = false;
    if (req.user) {
      const likedTrack = await prisma.likedTrack.findUnique({
        where: {
          userId_trackId: {
            userId: req.user.id,
            trackId: id,
          },
        },
      });
      isLiked = !!likedTrack;
    }

    // Формируем правильные URL
    const trackWithUrls = {
      ...track,
      coverUrl: track.coverPath 
        ? `/api/tracks/file/cover/${path.basename(track.coverPath)}`
        : track.coverUrl,
      audioUrl: track.audioPath
        ? `/api/tracks/file/audio/${path.basename(track.audioPath)}`
        : track.audioUrl,
    };

    res.json({ track: trackWithUrls, isLiked });
  }
);

// GET /api/tracks/:id/stream
export const streamTrack = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        artistName: true,
        audioUrl: true,
        audioPath: true,
      },
    });

    if (!track) {
      throw new AppError('Track not found', 404);
    }

    // Увеличение счетчика прослушиваний
    await prisma.track.update({
      where: { id },
      data: { playsCount: { increment: 1 } },
    });

    // Если пользователь авторизован, записываем в историю
    if (req.user) {
      await prisma.playHistory.create({
        data: {
          userId: req.user.id,
          trackId: id,
        },
      });
    }

    // Если есть локальный файл - возвращаем путь к нему
    if (track.audioPath) {
      const audioUrl = `/api/tracks/file/audio/${path.basename(track.audioPath)}`;
      res.json({
        url: audioUrl,
        title: track.title,
        artist: track.artistName,
        isLocal: true,
      });
    } else {
      // Иначе возвращаем внешний URL
      res.json({
        url: track.audioUrl,
        title: track.title,
        artist: track.artistName,
        isLocal: false,
      });
    }
  }
);

// GET /api/tracks/:id/lyrics
export const getTrackLyrics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        artistName: true,
        lyrics: true,
        lyricsPath: true,
      },
    });

    if (!track) {
      throw new AppError('Track not found', 404);
    }

    // Если есть сохраненные lyrics в БД
    if (track.lyrics) {
      return res.json({
        lyrics: track.lyrics,
        source: 'database',
      });
    }

    // Если есть LRC файл - парсим его
    if (track.lyricsPath) {
      const fullPath = path.join(__dirname, '../../', track.lyricsPath);
      const parsed = parseLrcFile(fullPath);
      
      if (parsed) {
        // Сохраняем распарсенные lyrics в БД для быстрого доступа
        const lyricsJson = {
          metadata: parsed.metadata,
          lines: parsed.lyrics.map(line => ({
            time: line.time,
            text: line.text,
          })),
        };

        await prisma.track.update({
          where: { id },
          data: { lyrics: lyricsJson },
        });

        return res.json({
          lyrics: lyricsJson,
          source: 'lrc-file',
        });
      }
    }

    // Lyrics не найдены
    res.json({
      lyrics: null,
      message: 'Lyrics not available for this track',
    });
  }
);

// GET /api/tracks/file/:type/:filename
export const streamLocalFile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, filename } = req.params;

    // Определяем папку в зависимости от типа
    let folder: string;
    let contentType: string;

    if (type === 'audio') {
      folder = 'storage/tracks';
      contentType = 'audio/mpeg';
    } else if (type === 'cover') {
      folder = 'storage/covers';
      contentType = 'image/jpeg';
    } else {
      throw new AppError('Invalid file type', 400);
    }

    const filePath = path.join(__dirname, '../../', folder, filename);

    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Если запрошен range (для seeking)
    if (range && type === 'audio') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      file.pipe(res);
    } else {
      // Полная отдача файла
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  }
);
