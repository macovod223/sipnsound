/**
 * Artist Routes для управления артистами
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  getArtists, 
  getArtistById, 
  createArtist, 
  updateArtist, 
  deleteArtist,
  getArtistTracks,
  getArtistAlbums,
  getAllAlbums,
  updateAlbum,
  getArtistImage,
  followArtist,
  unfollowArtist,
  checkFollowing,
} from '../controllers/artist.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

// Настройка multer для загрузки изображений артистов
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(__dirname, '../../storage/artists');
    
    // Создаем папку если не существует
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `artist-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedImageTypes = /jpg|jpeg|png|webp/;
    const isValid = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.') as any, false);
    }
  }
});

// Public routes
router.get('/', getArtists);
router.get('/albums', getAllAlbums); // Получить все альбомы (для админ-панели)
router.get('/image/:filename', getArtistImage);
router.get('/:id', getArtistById);
router.get('/:id/tracks', getArtistTracks);
router.get('/:id/albums', getArtistAlbums);

// Following routes (require authentication)
router.get('/:id/follow', authenticate, checkFollowing);
router.post('/:id/follow', authenticate, followArtist);
router.delete('/:id/follow', authenticate, unfollowArtist);

// Admin routes (require authentication and admin privileges)
router.use(authenticate);
router.use(requireAdmin);

router.post('/', upload.single('imageFile'), createArtist);
router.put('/:id', upload.single('imageFile'), updateArtist);
router.delete('/:id', deleteArtist);

// Альбомы - используем multer для обложек
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(__dirname, '../../storage/covers');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `coverFile-${uniqueSuffix}${ext}`);
  }
});

const coverUpload = multer({ 
  storage: coverStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedImageTypes = /jpg|jpeg|png|webp/;
    const isValid = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.') as any, false);
    }
  }
});

router.put('/albums/:id', coverUpload.single('coverFile'), updateAlbum);

export default router;
