import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

// GET /api/users/:id
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            playlists: true,
            likedTracks: true,
            uploadedTracks: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  }
);

