import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middlewares/error.middleware';
import { logger } from '../utils/logger';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;
const ML_SERVICE_URL = process.env.AI_DJ_SERVICE_URL || 'http://localhost:5001';

export const getAIDJSession = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const requestedLimit = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  try {
    const userId = (req as any).userId;

    const shuffle = <T,>(arr: T[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    // Получаем историю пользователя для ML
    let userHistory: string[] = [];
    let preferredGenres: string[] = [];
    let preferredArtists: string[] = [];

    if (userId) {
      const [liked, history] = await Promise.all([
        prisma.likedTrack.findMany({
          where: { userId },
          take: 20,
          include: {
            track: {
              include: { genre: true, artist: true },
            },
          },
        }),
        prisma.playHistory.findMany({
          where: { userId },
          orderBy: { playedAt: 'desc' },
          take: 20,
          include: {
            track: {
              include: { genre: true, artist: true },
            },
          },
        }),
      ]);

      // Формируем историю для ML сервиса (UUID треков)
      const allTracks = [...liked.map(l => l.track), ...history.map(h => h.track)];
      userHistory = allTracks
        .filter(t => t && t.id)
        .map(t => t.id);

      // Собираем предпочитаемые жанры и артисты
      const genreCount = new Map<string, number>();
      const artistCount = new Map<string, number>();

      for (const track of allTracks) {
        if (track?.genre?.name) {
          genreCount.set(track.genre.name, (genreCount.get(track.genre.name) || 0) + 1);
        }
        if (track?.artist?.name) {
          artistCount.set(track.artist.name, (artistCount.get(track.artist.name) || 0) + 1);
        }
      }

      preferredGenres = Array.from(genreCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);

      preferredArtists = Array.from(artistCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);
    }

    // Пытаемся получить рекомендации от ML сервиса
    let mlRecommendations: any[] = [];
    let usingML = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const mlResponse = await fetch(`${ML_SERVICE_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: userHistory.slice(0, 10),
          genres: preferredGenres,
          artists: preferredArtists,
          limit,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (mlResponse.ok) {
        const mlData: any = await mlResponse.json();
        mlRecommendations = mlData.recommendations || [];
        usingML = mlRecommendations.length > 0;
        logger.info(`ML service returned ${mlRecommendations.length} recommendations`);
      }
    } catch (mlError: any) {
      if (mlError.name !== 'AbortError') {
        logger.warn(`ML service unavailable: ${mlError.message}`);
      }
    }

    // Если ML сервис дал рекомендации, ищем эти треки в нашей БД
    if (usingML && mlRecommendations.length > 0) {
      const tracks = [];

      for (const rec of mlRecommendations.slice(0, limit * 2)) {
        let foundTracks: Array<{
          id: string;
          title: string;
          artist: { id: string; name: string; imageUrl: string | null; verified: boolean } | null;
          album: { id: string; title: string; year: number | null; coverUrl: string | null } | null;
          genre: { id: string; name: string; color: string | null } | null;
        }> = [];
        
        // Модель из БД всегда возвращает ID, ищем напрямую по ID
        if (rec.id) {
          const track = await prisma.track.findUnique({
            where: { id: rec.id, isPublished: true },
            include: {
              artist: { select: { id: true, name: true, imageUrl: true, verified: true } },
              album: { select: { id: true, title: true, year: true, coverUrl: true } },
              genre: { select: { id: true, name: true, color: true } },
            },
          });
          if (track) foundTracks = [track];
        }

        if (foundTracks.length > 0) {
          tracks.push(foundTracks[0]);
          if (tracks.length >= limit) break;
        }
      }

      if (tracks.length > 0) {
        return res.json({
          tracks: tracks.slice(0, limit),
          source: 'ml-service',
          matched: tracks.length,
        });
      }
    }

    // Fallback: умная выборка из БД
    const candidates = await prisma.track.findMany({
      where: { isPublished: true },
      orderBy: { playsCount: 'desc' },
      take: Math.max(limit * 4, 100),
      include: {
        artist: { select: { id: true, name: true, imageUrl: true, verified: true } },
        album: { select: { id: true, title: true, year: true, coverUrl: true } },
        genre: { select: { id: true, name: true, color: true } },
      },
    });

    if (!userId || (preferredGenres.length === 0 && preferredArtists.length === 0)) {
      const shuffled = shuffle(candidates).slice(0, limit);
      return res.json({ tracks: shuffled, source: 'db-popular' });
    }

    // Эвристика по жанрам/артистам
    const seen = new Set<string>();
    const result: typeof candidates = [];

    const pushMatches = (predicate: (t: typeof candidates[number]) => boolean) => {
      for (const t of shuffle(candidates)) {
        if (result.length >= limit) break;
        if (seen.has(t.id)) continue;
        if (predicate(t)) {
          result.push(t);
          seen.add(t.id);
        }
      }
    };

    pushMatches(t => preferredGenres.includes(t.genre?.name || ''));
    pushMatches(t => preferredArtists.includes(t.artist?.name || ''));
    pushMatches(_ => true);

    res.json({
      tracks: result.slice(0, limit),
      source: 'db-personalized',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`AI DJ session failed: ${message}`);
    res.status(500).json({ error: 'Failed to build AI DJ session' });
  }
});

