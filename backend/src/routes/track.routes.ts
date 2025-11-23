import { Router } from 'express';
import { 
  getTracks, 
  getTrackById, 
  streamTrack,
  getTrackLyrics,
  streamLocalFile,
} from '../controllers/track.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Список треков (с опциональной аутентификацией)
router.get('/', optionalAuth, getTracks);

// Детали трека
router.get('/:id', optionalAuth, getTrackById);

// Стриминг аудио
router.get('/:id/stream', optionalAuth, streamTrack);

// Получить текст песни (LRC)
router.get('/:id/lyrics', optionalAuth, getTrackLyrics);

// Стриминг локального файла (аудио/обложка)
router.get('/file/:type/:filename', streamLocalFile);

// TODO: Добавить позже
// POST /upload - Загрузка трека (требуется аутентификация)
// PUT /:id - Обновление трека
// DELETE /:id - Удаление трека
// POST /:id/play - Записать воспроизведение

export default router;
