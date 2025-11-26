import { Request, Response } from 'express';
import path from 'path';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

// GET /api/users/:id
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
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

// PUT /api/users/me
export const updateCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { username, displayName, avatarUrl } = req.body;

    const updateData: Record<string, any> = {};

    if (username !== undefined) {
      const normalizedUsername = String(username).trim();
      if (!normalizedUsername) {
        throw new AppError('Username cannot be empty', 400);
      }

      const existingUser = await prisma.user.findUnique({
        where: { username: normalizedUsername },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== req.user.id) {
        throw new AppError('Username is already taken', 400);
      }

      updateData.username = normalizedUsername;
    }

    if (displayName !== undefined) {
      const normalizedDisplayName = String(displayName).trim();
      updateData.displayName = normalizedDisplayName.length ? normalizedDisplayName : null;
    }

    if (avatarUrl !== undefined) {
      const normalizedAvatar = String(avatarUrl).trim();
      updateData.avatarUrl = normalizedAvatar.length ? normalizedAvatar : null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields provided to update', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    res.json({ user: updatedUser });
  }
);

// GET /api/users/me/liked-tracks
export const getLikedTracks = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const likedTracks = await prisma.likedTrack.findMany({
      where: { userId: req.user.id },
      orderBy: { likedAt: 'desc' },
      include: {
        track: {
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
                artist: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        },
      },
    });

    const formattedTracks = likedTracks.map((likedTrack) => ({
      id: likedTrack.track.id,
      title: likedTrack.track.title,
      artist: likedTrack.track.artist.name,
      artistId: likedTrack.track.artist.id,
      image: likedTrack.track.coverPath 
        ? `/api/tracks/file/cover/${path.basename(likedTrack.track.coverPath)}`
        : likedTrack.track.coverUrl || '',
      genre: likedTrack.track.genre?.name || 'Unknown',
      duration: likedTrack.track.duration,
      audioUrl: likedTrack.track.audioPath
        ? `/api/tracks/file/audio/${path.basename(likedTrack.track.audioPath)}`
        : likedTrack.track.audioUrl,
      lyricsUrl: likedTrack.track.lyricsPath,
      playsCount: likedTrack.track.playsCount || 0,
      album: likedTrack.track.album?.title || 'Unknown Album',
      albumId: likedTrack.track.album?.id,
      albumType: likedTrack.track.album?.type,
      likedAt: likedTrack.likedAt,
    }));

    res.json({ tracks: formattedTracks });
  }
);

// GET /api/users/me/following
export const getFollowingArtists = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const following = await prisma.following.findMany({
      where: { userId: req.user.id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            bio: true,
            imageUrl: true,
            imagePath: true,
            verified: true,
            monthlyListeners: true,
          },
        },
      },
      orderBy: {
        followedAt: 'desc',
      },
    });

    const artists = following.map((f) => f.artist);

    res.json(artists);
  }
);

