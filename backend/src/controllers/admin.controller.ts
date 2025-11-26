import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * GET /api/admin/stats
 * Получение статистики для админ-панели
 */
export const getStats = asyncHandler(
  async (req: Request, res: Response) => {
    // Подсчитываем количество треков
    const tracksCount = await prisma.track.count();

    // Подсчитываем количество плейлистов
    const playlistsCount = await prisma.playlist.count();

    // Подсчитываем количество пользователей
    const usersCount = await prisma.user.count();

    // Подсчитываем общее количество прослушиваний (сумма всех playsCount треков)
    const tracksWithPlays = await prisma.track.aggregate({
      _sum: {
        playsCount: true,
      },
    });

    const totalPlays = tracksWithPlays._sum.playsCount || 0;

    res.json({
      tracks: tracksCount,
      playlists: playlistsCount,
      users: usersCount,
      totalPlays: totalPlays,
    });
  }
);

