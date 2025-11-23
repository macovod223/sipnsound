/**
 * Admin Routes для управления треками и плейлистами
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  uploadTrack, 
  uploadPlaylist, 
  getAdminStats,
  deleteTrack,
  updateTrack,
  bulkUploadTracks
} from '../controllers/admin.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = '';
    
    switch (file.fieldname) {
      case 'audioFile':
        uploadPath = path.join(__dirname, '../../storage/tracks');
        break;
      case 'coverFile':
        uploadPath = path.join(__dirname, '../../storage/covers');
        break;
      case 'lyricsFile':
        uploadPath = path.join(__dirname, '../../storage/lyrics');
        break;
      default:
        uploadPath = path.join(__dirname, '../../uploads');
    }
    
    // Создаем папку если не существует
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedAudioTypes = /mp3|wav|flac|m4a|ogg/;
    const allowedImageTypes = /jpg|jpeg|png|webp/;
    const allowedTextTypes = /lrc|txt/;
    
    let isValid = false;
    
    if (file.fieldname === 'audioFile') {
      isValid = allowedAudioTypes.test(path.extname(file.originalname).toLowerCase());
    } else if (file.fieldname === 'coverFile') {
      isValid = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    } else if (file.fieldname === 'lyricsFile') {
      isValid = allowedTextTypes.test(path.extname(file.originalname).toLowerCase());
    }
    
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Все админские роуты требуют аутентификации и админских прав
router.use(authenticateJWT);
router.use(requireAdmin);

// Статистика админа
router.get('/stats', getAdminStats);

// Загрузка одного трека
router.post('/tracks/upload', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverFile', maxCount: 1 },
  { name: 'lyricsFile', maxCount: 1 }
]), uploadTrack);

// Массовая загрузка треков
router.post('/tracks/bulk-upload', upload.fields([
  { name: 'audioFiles', maxCount: 10 },
  { name: 'coverFiles', maxCount: 10 },
  { name: 'lyricsFiles', maxCount: 10 }
]), bulkUploadTracks);

// Создание плейлиста
router.post('/playlists/create', upload.single('coverFile'), uploadPlaylist);

// Обновление трека
router.put('/tracks/:id', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverFile', maxCount: 1 },
  { name: 'lyricsFile', maxCount: 1 }
]), updateTrack);

// Удаление трека
router.delete('/tracks/:id', deleteTrack);

export default router;
