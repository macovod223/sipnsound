import { Router } from 'express';
import { 
  getPlaylists, 
  getPlaylistById, 
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} from '../controllers/playlist.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Список плейлистов (требуется аутентификация)
router.get('/', authenticate, getPlaylists);

// Детали плейлиста
router.get('/:id', optionalAuth, getPlaylistById);

// Создание плейлиста
router.post('/', authenticate, createPlaylist);

// Обновление плейлиста
router.put('/:id', authenticate, updatePlaylist);

// Удаление плейлиста
router.delete('/:id', authenticate, deletePlaylist);

// TODO: Добавить позже
// POST /:id/tracks - Добавить трек в плейлист
// DELETE /:id/tracks/:trackId - Удалить трек из плейлиста
// PUT /:id/tracks/reorder - Изменить порядок треков

export default router;

