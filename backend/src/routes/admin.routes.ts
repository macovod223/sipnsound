import { Router } from 'express';
import { getStats } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

// Все роуты требуют аутентификации и прав администратора
router.use(authenticate, requireAdmin);

// GET /api/admin/stats - Получить статистику
router.get('/stats', getStats);

export default router;

