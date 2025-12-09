import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

type UploadedFiles = {
  audioFile?: Express.Multer.File[];
  coverFile?: Express.Multer.File[];
  lyricsFile?: Express.Multer.File[];
};

const parseBoolean = (value: any, defaultValue: boolean) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1';
};

const deleteFileIfExists = (relativePath?: string | null) => {
  if (!relativePath) {
    return;
  }
  const absolutePath = path.join(__dirname, '../../', relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const formatTrackMedia = (track: any) => {
  if (!track) {
    return track;
  }
  const formatted = { ...track };
  if (track.coverPath) {
    formatted.coverUrl = `/api/tracks/file/cover/${path.basename(track.coverPath)}`;
  }
  if (track.audioPath) {
    formatted.audioUrl = `/api/tracks/file/audio/${path.basename(track.audioPath)}`;
  }
  return formatted;
};

const normalizeRelationId = (value: any): string | null | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (!trimmed.length) {
    return null;
  }

  return trimmed;
};

const parseNonNegativeInt = (value: any, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  // Удаляем пробелы и другие разделители
  const cleaned = String(value).replace(/[\s,]/g, '');
  
  // Проверяем, что строка содержит только цифры
  if (!/^\d+$/.test(cleaned)) {
    return fallback;
  }
  
  // Используем BigInt для больших чисел, затем конвертируем в Number
  // PostgreSQL Int может хранить до 2,147,483,647
  try {
    const bigIntValue = BigInt(cleaned);
    // Проверяем, что число не превышает максимальное значение для PostgreSQL Int
    const MAX_INT = BigInt(2147483647);
    if (bigIntValue > MAX_INT) {
      throw new Error('Value exceeds maximum integer limit (2,147,483,647)');
    }
    const parsed = Number(bigIntValue);
    if (parsed < 0 || !Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
  } catch (error) {
    // Если не удалось распарсить, возвращаем fallback
    return fallback;
  }
};

// POST /api/admin/tracks - Создание трека
export const createTrack = asyncHandler(
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      title,
      artistId,
      artistName,
      albumId,
      albumName,
      albumYear,
      genreId,
      genreName,
      duration,
      audioUrl,
      audioPath,
      coverUrl,
      coverPath,
      lyricsPath,
      isExplicit,
      isPublished,
      playsCount,
    } = req.body;
    const uploadedFiles = req.files as UploadedFiles | undefined;
    const audioFile = uploadedFiles?.audioFile?.[0] || null;
    const coverFile = uploadedFiles?.coverFile?.[0] || null;
    const lyricsFile = uploadedFiles?.lyricsFile?.[0] || null;

    let normalizedArtistId = normalizeRelationId(artistId);
    const normalizedArtistName = (artistName || '').trim();

    if (!normalizedArtistId) {
      if (!normalizedArtistName) {
        throw new AppError('Artist ID or artist name is required', 400);
      }

      const existingArtist = await prisma.artist.findFirst({
        where: {
          name: {
            equals: normalizedArtistName,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (existingArtist) {
        normalizedArtistId = existingArtist.id;
      } else {
        const createdArtist = await prisma.artist.create({
          data: { name: normalizedArtistName },
          select: { id: true },
        });
        normalizedArtistId = createdArtist.id;
      }
    } else {
      const artist = await prisma.artist.findUnique({
        where: { id: normalizedArtistId },
      });

      if (!artist) {
        throw new AppError('Artist not found', 404);
      }
    }

    const parsedDuration = parseInt(String(duration ?? '0'), 10);
    if (!parsedDuration || Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      throw new AppError('Duration must be a positive integer', 400);
    }

    if (!audioFile && !audioUrl && !audioPath) {
      throw new AppError('Audio file or audio URL is required', 400);
    }

    let resolvedAlbumId = normalizeRelationId(albumId);
    if (resolvedAlbumId === undefined) {
      resolvedAlbumId = null;
    }
    const normalizedAlbumName = (albumName || '').trim();
    
    // Если альбом не выбран и не указано название, создаем сингл автоматически
    if (!resolvedAlbumId && !normalizedAlbumName) {
      // Создаем сингл с названием трека
      const coverPathFromFile = coverFile ? `storage/covers/${coverFile.filename}` : (coverPath || null);
      const coverUrlFromInput = typeof coverUrl === 'string' && coverUrl.trim().length > 0 ? coverUrl.trim() : null;
      const trackTitle = (title || '').trim() || 'Untitled';
      // Парсим год альбома, если указан, иначе используем текущий год
      const albumYearValue = albumYear 
        ? parseInt(String(albumYear).trim(), 10) 
        : new Date().getFullYear();
      const validYear = (!isNaN(albumYearValue) && albumYearValue >= 1900 && albumYearValue <= new Date().getFullYear() + 1)
        ? albumYearValue
        : new Date().getFullYear();
      const createdAlbum = await prisma.album.create({
        data: {
          title: trackTitle, // Используем название трека как название сингла
          artistId: normalizedArtistId,
          year: validYear,
          type: 'single',
          coverPath: coverPathFromFile,
          coverUrl: coverFile 
            ? `/api/tracks/file/cover/${coverFile.filename}`
            : coverUrlFromInput,
        },
        select: { id: true },
      });
      resolvedAlbumId = createdAlbum.id;
    } else if (!resolvedAlbumId && normalizedAlbumName) {
      // Если указано название альбома, ищем существующий или создаем новый
      const existingAlbum = await prisma.album.findFirst({
        where: {
          title: normalizedAlbumName,
          artistId: normalizedArtistId,
        },
        select: { id: true },
      });

      if (existingAlbum) {
        resolvedAlbumId = existingAlbum.id;
        // Обложка альбома будет обновлена после создания трека
      } else {
        // При создании альбома берем обложку из трека
        // Если пользователь явно указал название альбома, создаем как "album"
        // Сингл создается только автоматически, если альбом не указан
        const coverPathFromFile = coverFile ? `storage/covers/${coverFile.filename}` : (coverPath || null);
        const coverUrlFromInput = typeof coverUrl === 'string' && coverUrl.trim().length > 0 ? coverUrl.trim() : null;
        // Парсим год альбома, если указан, иначе используем текущий год
        const albumYearValue = albumYear 
          ? parseInt(String(albumYear).trim(), 10) 
          : new Date().getFullYear();
        const validYear = (!isNaN(albumYearValue) && albumYearValue >= 1900 && albumYearValue <= new Date().getFullYear() + 1)
          ? albumYearValue
          : new Date().getFullYear();
        const createdAlbum = await prisma.album.create({
          data: {
            title: normalizedAlbumName,
            artistId: normalizedArtistId,
            year: validYear,
            type: 'album', // Явно созданный альбом = album
            coverPath: coverPathFromFile,
            coverUrl: coverFile 
              ? `/api/tracks/file/cover/${coverFile.filename}`
              : coverUrlFromInput,
          },
          select: { id: true },
        });
        resolvedAlbumId = createdAlbum.id;
      }
    }

    let resolvedGenreId = normalizeRelationId(genreId);
    if (resolvedGenreId === undefined) {
      resolvedGenreId = null;
    }
    const normalizedGenreName = (genreName || '').trim();
    if (!resolvedGenreId && normalizedGenreName) {
      const existingGenre = await prisma.genre.findUnique({
        where: { name: normalizedGenreName },
        select: { id: true },
      });

      if (existingGenre) {
        resolvedGenreId = existingGenre.id;
      } else {
        const createdGenre = await prisma.genre.create({
          data: { name: normalizedGenreName },
          select: { id: true },
        });
        resolvedGenreId = createdGenre.id;
      }
    }

    const audioPathFromFile = audioFile ? `storage/tracks/${audioFile.filename}` : (audioPath || null);
    const coverPathFromFile = coverFile ? `storage/covers/${coverFile.filename}` : (coverPath || null);
    const lyricsPathFromFile = lyricsFile ? `storage/lyrics/${lyricsFile.filename}` : (lyricsPath || null);
    const audioFileName = audioFile?.filename || (audioPathFromFile ? path.basename(audioPathFromFile) : null);
    let sanitizedAudioUrl: string | null = null;
    if (audioFileName) {
      sanitizedAudioUrl = `/api/tracks/file/audio/${audioFileName}`;
    } else if (typeof audioUrl === 'string' && audioUrl.trim().length > 0) {
      sanitizedAudioUrl = audioUrl.trim();
    }
    if (!sanitizedAudioUrl) {
      throw new AppError('Audio file or audio URL is required', 400);
    }
    const sanitizedCoverUrl =
      !coverFile && typeof coverUrl === 'string' && coverUrl.trim().length > 0
        ? coverUrl.trim()
        : null;

    const trackData: Prisma.TrackCreateInput = {
      title,
      duration: parsedDuration,
      audioUrl: sanitizedAudioUrl,
      audioPath: audioPathFromFile,
      coverUrl: sanitizedCoverUrl,
      coverPath: coverPathFromFile,
      playsCount: parseNonNegativeInt(playsCount, 0),
      lyricsPath: lyricsPathFromFile,
      isExplicit: parseBoolean(isExplicit, false),
      isPublished: parseBoolean(isPublished, true),
      artist: {
        connect: { id: normalizedArtistId },
      },
    };

    if (resolvedAlbumId) {
      trackData.album = { connect: { id: resolvedAlbumId } };
    }

    if (resolvedGenreId) {
      trackData.genre = { connect: { id: resolvedGenreId } };
    }

    if (req.user?.id) {
      trackData.uploadedBy = { connect: { id: req.user.id } };
    }

    const track = await prisma.track.create({
      data: trackData,
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
        isExplicit: true,
        isPublished: true,
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
            type: true,
            coverUrl: true,
            coverPath: true,
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

    // Обновляем обложку и тип альбома
    if (resolvedAlbumId) {
      // Получаем текущий альбом, чтобы проверить его тип
      const currentAlbum = await prisma.album.findUnique({
        where: { id: resolvedAlbumId },
        select: { type: true },
      });
      
      // Подсчитываем количество треков в альбоме
      const tracksCount = await prisma.track.count({
        where: { albumId: resolvedAlbumId },
      });
      
      // Получаем обложку из созданного трека для обновления альбома
      const trackCoverPath = track.coverPath;
      const trackCoverUrl = track.coverUrl || (trackCoverPath ? `/api/tracks/file/cover/${path.basename(trackCoverPath)}` : null);
      
      // Обновляем альбом: обложку и тип (если альбом был single и теперь больше 1 трека, меняем на album)
      const albumUpdateData: any = {};
      
      // Если альбом был single и теперь в нем больше 1 трека, меняем на album
      // Если альбом был album, оставляем album
      if (currentAlbum?.type === 'single' && tracksCount > 1) {
        albumUpdateData.type = 'album';
      } else if (currentAlbum?.type === 'album') {
        // Если был album, остается album (даже если 1 трек)
        albumUpdateData.type = 'album';
      }
      
      if (trackCoverPath || trackCoverUrl) {
        if (trackCoverPath) {
          albumUpdateData.coverPath = trackCoverPath;
        }
        if (trackCoverUrl) {
          albumUpdateData.coverUrl = trackCoverUrl;
        }
      }
      
      await prisma.album.update({
        where: { id: resolvedAlbumId },
        data: albumUpdateData,
      });
    }
    
    res.status(201).json({
      message: 'Track created successfully',
      track: formatTrackMedia(track),
    });
    return;
  }
);

// PUT /api/admin/tracks/:id - Обновление трека
export const updateTrack = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existingTrack = await prisma.track.findUnique({
      where: { id },
    });
    
    if (!existingTrack) {
      throw new AppError('Track not found', 404);
    }
    
    const {
      title,
      artistId,
      albumId,
      albumName,
      genreId,
      genreName,
      duration,
      audioUrl,
      audioPath,
      coverUrl,
      coverPath,
      lyricsPath,
      isExplicit,
      isPublished,
      playsCount,
    } = req.body;

    const uploadedFiles = req.files as UploadedFiles | undefined;
    const audioFile = uploadedFiles?.audioFile?.[0] || null;
    const coverFile = uploadedFiles?.coverFile?.[0] || null;
    const lyricsFile = uploadedFiles?.lyricsFile?.[0] || null;
    
    if (artistId && artistId !== existingTrack.artistId) {
      const artist = await prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!artist) {
        throw new AppError('Artist not found', 404);
      }
    }

    const normalizedAlbumName = (albumName || '').trim();
    let resolvedAlbumId = normalizeRelationId(albumId);
    const targetArtistId = artistId || existingTrack.artistId;
    if ((resolvedAlbumId === undefined || resolvedAlbumId === null) && normalizedAlbumName) {
      const existingAlbum = await prisma.album.findFirst({
        where: {
          title: normalizedAlbumName,
          artistId: targetArtistId,
        },
        select: { id: true },
      });

      if (existingAlbum) {
        resolvedAlbumId = existingAlbum.id;
        // Обложка альбома будет обновлена после обновления трека
      } else {
        // При создании альбома берем обложку из трека
        const coverPathFromFile = coverFile ? `storage/covers/${coverFile.filename}` : (coverPath || null);
        const createdAlbum = await prisma.album.create({
          data: {
            title: normalizedAlbumName,
            artistId: targetArtistId,
            year: new Date().getFullYear(),
            type: 'single', // Первый трек = single
            coverPath: coverPathFromFile,
            coverUrl: coverFile 
              ? `/api/tracks/file/cover/${coverFile.filename}`
              : (coverUrl || null),
          },
          select: { id: true },
        });
        resolvedAlbumId = createdAlbum.id;
      }
    }

    let resolvedGenreId = normalizeRelationId(genreId);
    const normalizedGenreName = (genreName || '').trim();
    if ((resolvedGenreId === undefined || resolvedGenreId === null) && normalizedGenreName) {
      const existingGenre = await prisma.genre.findUnique({
        where: { name: normalizedGenreName },
        select: { id: true },
      });

      if (existingGenre) {
        resolvedGenreId = existingGenre.id;
      } else {
        const createdGenre = await prisma.genre.create({
          data: { name: normalizedGenreName },
          select: { id: true },
        });
        resolvedGenreId = createdGenre.id;
      }
    }

    const updateData: Prisma.TrackUpdateInput = {};
    if (title !== undefined) {
      updateData.title = title;
    }
    if (resolvedAlbumId !== undefined) {
      updateData.album = resolvedAlbumId
        ? { connect: { id: resolvedAlbumId } }
        : { disconnect: true };
    }
    if (resolvedGenreId !== undefined) {
      updateData.genre = resolvedGenreId
        ? { connect: { id: resolvedGenreId } }
        : { disconnect: true };
    }
    if (duration !== undefined) {
      const parsedDuration = parseInt(String(duration), 10);
      if (!parsedDuration || Number.isNaN(parsedDuration) || parsedDuration <= 0) {
        throw new AppError('Duration must be a positive integer', 400);
      }
      updateData.duration = parsedDuration;
    }
    if (isExplicit !== undefined) {
      updateData.isExplicit = parseBoolean(isExplicit, existingTrack.isExplicit);
    }
    if (isPublished !== undefined) {
      updateData.isPublished = parseBoolean(isPublished, existingTrack.isPublished);
    }
    if (playsCount !== undefined) {
      updateData.playsCount = parseNonNegativeInt(playsCount, existingTrack.playsCount ?? 0);
    }

    if (!audioFile && audioUrl !== undefined) {
      const normalizedAudioUrl = String(audioUrl).trim();
      if (normalizedAudioUrl.length > 0) {
        updateData.audioUrl = normalizedAudioUrl;
      }
    }
    if (audioPath !== undefined) {
      updateData.audioPath = audioPath ? String(audioPath).trim() : null;
    }
    if (!coverFile && coverUrl !== undefined) {
      updateData.coverUrl = coverUrl ? String(coverUrl).trim() : null;
    }
    if (coverPath !== undefined) {
      updateData.coverPath = coverPath ? String(coverPath).trim() : null;
    }
    if (lyricsPath !== undefined) {
      updateData.lyricsPath = lyricsPath ? String(lyricsPath).trim() : null;
    }

    if (audioFile) {
      deleteFileIfExists(existingTrack.audioPath);
      updateData.audioPath = `storage/tracks/${audioFile.filename}`;
      updateData.audioUrl = `/api/tracks/file/audio/${audioFile.filename}`;
    }

    if (coverFile) {
      deleteFileIfExists(existingTrack.coverPath);
      updateData.coverPath = `storage/covers/${coverFile.filename}`;
      updateData.coverUrl = `/api/tracks/file/cover/${coverFile.filename}`;
    }

    if (lyricsFile) {
      deleteFileIfExists(existingTrack.lyricsPath);
      updateData.lyricsPath = `storage/lyrics/${lyricsFile.filename}`;
    }

    if (artistId && artistId !== existingTrack.artistId) {
      updateData.artist = { connect: { id: artistId } };
    }

    if (
      Object.keys(updateData).length === 0 &&
      !audioFile &&
      !coverFile &&
      !lyricsFile
    ) {
      throw new AppError('No fields provided to update', 400);
    }

    // Сохраняем старый albumId для обновления типа альбома
    const oldAlbumId = existingTrack.albumId;

    const track = await prisma.track.update({
      where: { id },
      data: updateData,
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
            type: true,
            coverUrl: true,
            coverPath: true,
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

    // Обновляем тип альбомов и обложку на основе количества треков
    const updateAlbumTypeAndCover = async (albumId: string | null) => {
      if (!albumId) return;
      
      // Получаем текущий альбом, чтобы проверить его тип
      const currentAlbum = await prisma.album.findUnique({
        where: { id: albumId },
        select: { type: true },
      });
      
      const tracksCount = await prisma.track.count({
        where: { albumId },
      });
      
      // Получаем обложку из обновленного трека для обновления альбома
      const trackCoverPath = track.coverPath;
      const trackCoverUrl = track.coverUrl || (trackCoverPath ? `/api/tracks/file/cover/${path.basename(trackCoverPath)}` : null);
      
      // Обновляем альбом: тип и обложку (если есть)
      const albumUpdateData: any = {};
      
      // Если альбом был single и теперь в нем больше 1 трека, меняем на album
      // Если альбом был album, оставляем album (даже если 1 трек)
      if (currentAlbum?.type === 'single' && tracksCount > 1) {
        albumUpdateData.type = 'album';
      } else if (currentAlbum?.type === 'album') {
        albumUpdateData.type = 'album';
      } else if (tracksCount === 1) {
        // Если остался 1 трек и был single, остается single
        albumUpdateData.type = 'single';
      }
      
      if (trackCoverPath || trackCoverUrl) {
        if (trackCoverPath) {
          albumUpdateData.coverPath = trackCoverPath;
        }
        if (trackCoverUrl) {
          albumUpdateData.coverUrl = trackCoverUrl;
        }
      }
      
      await prisma.album.update({
        where: { id: albumId },
        data: albumUpdateData,
      });
    };

    // Обновляем тип старого альбома (если трек был удален из него)
    if (oldAlbumId && oldAlbumId !== track.album?.id) {
      const oldAlbum = await prisma.album.findUnique({
        where: { id: oldAlbumId },
        select: { type: true },
      });
      
      const tracksCount = await prisma.track.count({
        where: { albumId: oldAlbumId },
      });
      
      // Если альбом был album, остается album даже если 1 трек
      // Если был single и остался 1 трек, остается single
      const albumType = (oldAlbum?.type === 'album') ? 'album' : (tracksCount > 1 ? 'album' : 'single');
      
      await prisma.album.update({
        where: { id: oldAlbumId },
        data: { type: albumType },
      });
    }

    // Обновляем тип и обложку нового альбома (если трек был добавлен в него)
    if (track.album?.id) {
      await updateAlbumTypeAndCover(track.album.id);
    }
    
    res.json({
      message: 'Track updated successfully',
      track: formatTrackMedia(track),
    });
    return;
  }
);

// DELETE /api/admin/tracks/:id - Удаление трека
export const deleteTrack = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Проверка существования трека
    const track = await prisma.track.findUnique({
      where: { id },
    });
    
    if (!track) {
      throw new AppError('Track not found', 404);
    }
    
    // Сохраняем albumId перед удалением для обновления типа альбома
    const albumId = track.albumId;
    
    // Удаление трека
    await prisma.track.delete({
      where: { id },
    });

    // Обновляем тип альбома на основе количества оставшихся треков
    if (albumId) {
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { type: true },
      });
      
      const tracksCount = await prisma.track.count({
        where: { albumId },
      });
      
      // Если альбом был album, остается album даже если 1 трек
      // Если был single и остался 1 трек, остается single
      const albumType = (album?.type === 'album') ? 'album' : (tracksCount > 1 ? 'album' : 'single');
      
      await prisma.album.update({
        where: { id: albumId },
        data: { type: albumType },
      });
    }
    
    res.json({
      message: 'Track deleted successfully',
      deletedTrackId: id,
    });
  }
);

// GET /api/admin/tracks - Получить все треки (включая неопубликованные)
export const getAllTracksAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { 
      page = '1', 
      limit = '50',
      sortBy = 'createdAt',
      order = 'desc',
      isPublished,
      search,
    } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Валидация параметра order
    const validOrder = order === 'asc' || order === 'desc' ? order : 'desc';
    
    const where: Prisma.TrackWhereInput = {};
    
    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    if (normalizedSearch.length) {
      where.OR = [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          artist: {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        },
        {
          album: {
            title: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        },
      ];
    }
    
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
            },
          },
          genre: {
            select: {
              id: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.track.count({ where }),
    ]);
    
    const formattedTracks = tracks.map(formatTrackMedia);
    
    res.json({
      tracks: formattedTracks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);
