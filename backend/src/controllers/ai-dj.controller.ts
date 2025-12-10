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
    const userId = req.user?.id;

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
    let historyWithDates: Array<{ id: string; playedAt: string }> = [];

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

      // Формируем историю для ML сервиса (UUID треков + даты прослушивания)
      // Создаем маппинг trackId -> playedAt для использования в ML модели
      const trackPlayDates = new Map<string, string>();
      
      // Добавляем даты из истории прослушиваний
      history.forEach(h => {
        if (h.track?.id && h.playedAt) {
          trackPlayDates.set(h.track.id, h.playedAt.toISOString());
        }
      });
      
      // Добавляем лайки (используем текущую дату как приближение)
      liked.forEach(l => {
        if (l.track?.id && !trackPlayDates.has(l.track.id)) {
          trackPlayDates.set(l.track.id, new Date().toISOString());
        }
      });
      
      const allTracks = [...liked.map(l => l.track), ...history.map(h => h.track)];
      userHistory = allTracks
        .filter(t => t && t.id)
        .map(t => t.id);
      
      // Формируем историю с датами для ML сервиса
      historyWithDates = userHistory.map(trackId => ({
        id: trackId,
        playedAt: trackPlayDates.get(trackId) || new Date().toISOString()
      }));

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

    logger.info(`[AI DJ] Запрос к ML сервису: ${ML_SERVICE_URL}/recommend`);
    logger.info(`[AI DJ] Параметры: history=${userHistory.length}, genres=${preferredGenres.length}, artists=${preferredArtists.length}, limit=${limit}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const requestBody = {
        history: userHistory.slice(0, 20),
        historyWithDates: historyWithDates.slice(0, 20),
        genres: preferredGenres,
        artists: preferredArtists,
        limit,
      };
      
      logger.info(`[AI DJ] Отправка запроса к ML сервису: ${JSON.stringify({ ...requestBody, history: requestBody.history.length, historyWithDates: requestBody.historyWithDates.length })}`);

      const mlResponse = await fetch(`${ML_SERVICE_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      logger.info(`[AI DJ] ML сервис ответил: ${mlResponse.status} ${mlResponse.statusText}`);

      if (mlResponse.ok) {
        const mlData: any = await mlResponse.json();
        mlRecommendations = mlData.recommendations || [];
        usingML = mlRecommendations.length > 0;
        logger.info(`[AI DJ] ML service returned ${mlRecommendations.length} recommendations, method: ${mlData.method || 'unknown'}`);
        logger.info(`[AI DJ] First 3 recommendations: ${JSON.stringify(mlRecommendations.slice(0, 3).map((r: any) => ({ id: r.id, title: r.title, artist: r.artist })))}`);
      } else {
        const errorText = await mlResponse.text();
        logger.error(`[AI DJ] ML service error: ${mlResponse.status} ${mlResponse.statusText} - ${errorText}`);
      }
    } catch (mlError: any) {
      if (mlError.name !== 'AbortError') {
        logger.warn(`[AI DJ] ML service unavailable: ${mlError.message}`);
        logger.warn(`[AI DJ] ML service URL: ${ML_SERVICE_URL}`);
      } else {
        logger.warn(`[AI DJ] ML service request timeout`);
      }
    }

    // Если ML сервис дал рекомендации, ищем эти треки в нашей БД
    if (usingML && mlRecommendations.length > 0) {
      logger.info(`[AI DJ] Поиск ${mlRecommendations.length} треков в БД по рекомендациям ML`);
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
          if (track) {
            foundTracks = [track];
            logger.debug(`[AI DJ] Найден трек: ${track.title} (${track.id})`);
          } else {
            logger.warn(`[AI DJ] Трек не найден в БД: ${rec.id} (${rec.title || 'unknown'})`);
          }
        } else {
          logger.warn(`[AI DJ] Рекомендация без ID: ${JSON.stringify(rec)}`);
        }

        if (foundTracks.length > 0) {
          tracks.push(foundTracks[0]);
          if (tracks.length >= limit) break;
        }
      }

      logger.info(`[AI DJ] Найдено треков в БД: ${tracks.length} из ${mlRecommendations.length} рекомендаций`);

      if (tracks.length > 0) {
        return res.json({
          tracks: tracks.slice(0, limit),
          source: 'ml-service',
          matched: tracks.length,
        });
      } else {
        logger.warn(`[AI DJ] Ни один трек из рекомендаций не найден в БД, используем fallback`);
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

