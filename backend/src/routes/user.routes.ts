import { Router } from 'express';
import { getUserProfile } from '../controllers/user.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Профиль пользователя
router.get('/:id', optionalAuth, getUserProfile);

// TODO: Добавить позже
// PUT /:id - Обновить профиль
// GET /:id/playlists - Публичные плейлисты
// GET /:id/history - История прослушивания

export default router;

