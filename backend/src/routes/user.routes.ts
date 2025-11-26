import { Router } from 'express';
import { getUserProfile, updateCurrentUser, getLikedTracks, getFollowingArtists } from '../controllers/user.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.put('/me', authenticate, updateCurrentUser);
router.get('/me/liked-tracks', authenticate, getLikedTracks);
router.get('/me/following', authenticate, getFollowingArtists);

// Профиль пользователя
router.get('/:id', optionalAuth, getUserProfile);

export default router;

