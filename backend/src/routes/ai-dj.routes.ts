import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getAIDJSession } from '../controllers/ai-dj.controller';

const router = Router();

router.get('/session', authenticate, getAIDJSession);

export default router;

