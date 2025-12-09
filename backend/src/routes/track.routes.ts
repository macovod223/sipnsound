import { Router } from 'express';
import { 
  getTracks, 
  getTrackById, 
  streamTrack,
  getTrackLyrics,
  streamLocalFile,
  likeTrack,
  unlikeTrack,
  recordPlayHistory,
} from '../controllers/track.controller';
import { optionalAuth, authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Список треков (с опциональной аутентификацией)
router.get('/', optionalAuth, getTracks);

// Детали трека
router.get('/:id', optionalAuth, getTrackById);

// Стриминг аудио
router.get('/:id/stream', optionalAuth, streamTrack);

// Получить текст песни (LRC)
router.get('/:id/lyrics', optionalAuth, getTrackLyrics);

// Лайк/анлайк трека
router.post('/:id/like', authenticate, likeTrack);
router.delete('/:id/like', authenticate, unlikeTrack);

// Запись истории прослушиваний
router.post('/:id/play-history', authenticate, recordPlayHistory);

// Стриминг локального файла (аудио/обложка)
router.get('/file/:type/:filename', streamLocalFile);

export default router;
