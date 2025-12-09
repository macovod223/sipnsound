import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import { parseLrcFile } from '../utils/lrc-parser';

// GET /api/tracks
export const getTracks = asyncHandler(
  async (req: Request, res: Response) => {
    const { 
      genreId,
      artistId,
      albumId,
      search,
      page = '1', 
      limit = '20',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Валидация параметра order
    const validOrder = order === 'asc' || order === 'desc' ? order : 'desc';

    // Построение фильтров
    const includeAll = req.query.includeAll === 'true' && req.user?.username?.toLowerCase().includes('admin');

    const baseWhere: Prisma.TrackWhereInput = {};
    
    if (!includeAll) {
      baseWhere.isPublished = true;
    }
    
    if (genreId && typeof genreId === 'string') {
      baseWhere.genreId = genreId;
    }
    
    if (artistId && typeof artistId === 'string') {
      baseWhere.artistId = artistId;
    }

    if (albumId && typeof albumId === 'string') {
      baseWhere.albumId = albumId;
    }
    
    const where: Prisma.TrackWhereInput = search
      ? {
          ...baseWhere,
          OR: [
        { title: { contains: search as string, mode: 'insensitive' } },
        { artist: { name: { contains: search as string, mode: 'insensitive' } } },
        { album: { is: { title: { contains: search as string, mode: 'insensitive' } } } },
          ],
    }
      : baseWhere;

    // Получение треков с связями
    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: validOrder },
        include: {
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
      }),
      prisma.track.count({ where }),
    ]);

    let resultTracks = tracks;
    let resultTotal = total;

    if (search && resultTracks.length === 0) {
      const normalizedSearch = (search as string).trim().toLocaleLowerCase('ru-RU');
      if (normalizedSearch) {
        // Prisma/ILIKE не умеет сравнивать кириллицу без учёта регистра в текущей локали,
        // поэтому выполняем fallback: загружаем опубликованные треки и фильтруем вручную.
        const fallbackTracks = await prisma.track.findMany({
          where: baseWhere,
          orderBy: { [sortBy as string]: validOrder },
          include: {
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
        });

        const filteredTracks = fallbackTracks.filter((track: any) => {
          const fieldsToCheck = [
            track.title,
            track.artist?.name,
            track.album?.title,
          ]
            .filter(Boolean)
            .map(value => value.toString().toLocaleLowerCase('ru-RU'));

          return fieldsToCheck.some(text => text.includes(normalizedSearch));
        });

        resultTotal = filteredTracks.length;
        resultTracks = filteredTracks.slice(skip, skip + limitNum);
      }
    }

    // Формируем URL для обложек и аудио
    const tracksWithMedia = resultTracks.map((track: any) => ({
      ...track,
      coverUrl: track.coverPath 
        ? `/api/tracks/file/cover/${path.basename(track.coverPath)}`
        : track.coverUrl,
      audioUrl: track.audioPath
        ? `/api/tracks/file/audio/${path.basename(track.audioPath)}`
        : track.audioUrl,
    }));

    res.json({
      tracks: tracksWithMedia,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: resultTotal,
        pages: Math.ceil(resultTotal / limitNum),
      },
    });
  }
);

// GET /api/tracks/:id
export const getTrackById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      include: {
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
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        audioPath: true,
        artist: {
          select: {
            name: true,
          },
        },
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
      return res.json({
        url: audioUrl,
        title: track.title,
        artist: track.artist.name,
        isLocal: true,
      });
    } else {
      // Иначе возвращаем внешний URL
      return res.json({
        url: track.audioUrl,
        title: track.title,
        artist: track.artist.name,
        isLocal: false,
      });
    }
  }
);

// GET /api/tracks/:id/lyrics
export const getTrackLyrics = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        lyrics: true,
        lyricsPath: true,
        artist: {
          select: {
            name: true,
          },
        },
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
          data: { lyrics: JSON.parse(JSON.stringify(lyricsJson)) },
        });

        return res.json({
          lyrics: lyricsJson,
          source: 'lrc-file',
        });
      }
    }

    // Lyrics не найдены
    return res.json({
      lyrics: null,
      message: 'Lyrics not available for this track',
    });
  }
);

// POST /api/tracks/:id/like
export const likeTrack = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new AppError('Track not found', 404);
    }

    // Проверяем, не лайкнут ли уже трек
    const existingLike = await prisma.likedTrack.findUnique({
      where: {
        userId_trackId: {
          userId: req.user.id,
          trackId: id,
        },
      },
    });

    if (existingLike) {
      // Если уже лайкнут, возвращаем успех
      res.json({ message: 'Track already liked', isLiked: true });
      return;
    }

    // Добавляем лайк
    await prisma.likedTrack.create({
      data: {
        userId: req.user.id,
        trackId: id,
      },
    });

    res.json({ message: 'Track liked successfully', isLiked: true });
  }
);

// DELETE /api/tracks/:id/like
export const unlikeTrack = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Удаляем лайк
    await prisma.likedTrack.deleteMany({
      where: {
        userId: req.user.id,
        trackId: id,
      },
    });

    res.json({ message: 'Track unliked successfully', isLiked: false });
  }
);

// POST /api/tracks/:id/play-history
export const recordPlayHistory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    try {
      const track = await prisma.track.findUnique({
        where: { id },
      });

      if (!track) {
        throw new AppError('Track not found', 404);
      }

      // Используем транзакцию для атомарности операций
      await prisma.$transaction(async (tx) => {
        // Записываем в историю прослушиваний
        await tx.playHistory.create({
          data: {
            userId: req.user!.id,
            trackId: id,
          },
        });

        // Увеличиваем счетчик прослушиваний
        await tx.track.update({
          where: { id },
          data: { playsCount: { increment: 1 } },
        });
      });

      res.json({ message: 'Play history recorded' });
    } catch (error: any) {
      // Логируем ошибку для отладки
      console.error('[PLAY_HISTORY] Error recording play history:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        trackId: id,
      });
      
      // Если это ошибка Prisma, пробрасываем её дальше
      if (error.code === 'P2002') {
        // Unique constraint violation - возможно, запись уже существует
        // Это не критично, просто игнорируем
        res.json({ message: 'Play history already recorded' });
        return;
      }
      
      // Для других ошибок пробрасываем дальше
      throw error;
    }
  }
);

// GET /api/tracks/file/:type/:filename
export const streamLocalFile = asyncHandler(
  async (req: Request, res: Response) => {
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
