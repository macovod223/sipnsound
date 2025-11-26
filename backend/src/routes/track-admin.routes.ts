import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createTrack,
  updateTrack,
  deleteTrack,
  getAllTracksAdmin,
} from '../controllers/track-admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = 'storage/tracks';
    if (file.fieldname === 'coverFile') {
      folder = 'storage/covers';
    } else if (file.fieldname === 'lyricsFile') {
      folder = 'storage/lyrics';
    }

    const uploadPath = path.join(__dirname, '../../', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const allowedExtensions: Record<string, RegExp> = {
  audioFile: /\.(mp3|wav|flac|m4a|ogg)$/i,
  coverFile: /\.(jpg|jpeg|png|webp)$/i,
  lyricsFile: /\.(lrc|txt)$/i,
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (_req, file, cb) => {
    const validator = allowedExtensions[file.fieldname];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!validator) {
      cb(new Error('Invalid field name for upload') as any, false);
      return;
    }

    if (!validator.test(ext)) {
      cb(new Error('Invalid file type') as any, false);
      return;
    }

    cb(null, true);
  },
});

const trackUploads = upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverFile', maxCount: 1 },
  { name: 'lyricsFile', maxCount: 1 },
]);

// Все роуты требуют аутентификации и прав администратора
router.use(authenticate, requireAdmin);

// GET /api/admin/tracks - Получить все треки
router.get('/', getAllTracksAdmin);

// POST /api/admin/tracks - Создать трек
router.post(
  '/',
  trackUploads,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('artistId').optional().trim(),
    body('duration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Duration must be a positive integer'),
  ],
  createTrack
);

// PUT /api/admin/tracks/:id - Обновить трек
router.put(
  '/:id',
  trackUploads,
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('artistId').optional().trim().notEmpty().withMessage('Artist ID cannot be empty'),
    body('albumId').optional().trim(),
    body('genreId').optional().trim(),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('audioUrl').optional().trim().notEmpty().withMessage('Audio URL cannot be empty'),
    body('audioPath').optional().trim(),
    body('coverUrl').optional().trim(),
    body('coverPath').optional().trim(),
    body('lyricsPath').optional().trim(),
  ],
  updateTrack
);

// DELETE /api/admin/tracks/:id - Удалить трек
router.delete('/:id', deleteTrack);

export default router;

