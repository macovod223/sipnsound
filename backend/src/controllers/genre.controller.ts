import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middlewares/error.middleware';

// GET /api/genres
export const getGenres = asyncHandler(
  async (_req: Request, res: Response) => {
    const genres = await prisma.genre.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            tracks: true,
          },
        },
      },
    });

    res.json({ genres });
  }
);

// GET /api/genres/:id
export const getGenreById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const genre = await prisma.genre.findUnique({
      where: { id },
      include: {
        tracks: {
          take: 50,
          orderBy: {
            playsCount: 'desc',
          },
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
          },
        },
      },
    });

    if (!genre) {
      return res.status(404).json({ message: 'Genre not found' });
    }

    res.json({ genre });
    return;
  }
);

