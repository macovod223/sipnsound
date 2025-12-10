import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware';
import { getAIDJSession } from '../controllers/ai-dj.controller';

const router = Router();

// Используем optionalAuth чтобы AI DJ работал и без входа (но с персонализацией если пользователь залогинен)
router.get('/session', optionalAuth, getAIDJSession);

export default router;

