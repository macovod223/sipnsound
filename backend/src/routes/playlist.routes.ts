import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  getPlaylists, 
  getPlaylistById, 
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistCover,
} from '../controllers/playlist.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../storage/playlist-covers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `playlist-cover-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const coverUpload = multer({
  storage: coverStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      cb(new Error('Invalid cover file type') as any, false);
      return;
    }
    cb(null, true);
  },
});

// Обложка плейлиста (публичный доступ)
router.get('/file/cover/:filename', getPlaylistCover);

// Список плейлистов (требуется аутентификация)
router.get('/', authenticate, getPlaylists);

// Детали плейлиста
router.get('/:id', optionalAuth, getPlaylistById);

// Создание плейлиста
router.post('/', authenticate, coverUpload.single('coverFile'), createPlaylist);

// Обновление плейлиста
router.put('/:id', authenticate, coverUpload.single('coverFile'), updatePlaylist);

// Удаление плейлиста
router.delete('/:id', authenticate, deletePlaylist);

export default router;

