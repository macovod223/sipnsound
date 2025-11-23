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
  getArtistAlbums
} from '../controllers/artist.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

// Настройка multer для загрузки изображений артистов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../storage/artists');
    
    // Создаем папку если не существует
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
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
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = /jpg|jpeg|png|webp/;
    const isValid = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Public routes
router.get('/', getArtists);
router.get('/:id', getArtistById);
router.get('/:id/tracks', getArtistTracks);
router.get('/:id/albums', getArtistAlbums);

// Admin routes (require authentication and admin privileges)
router.use(authenticateJWT);
router.use(requireAdmin);

router.post('/', upload.single('imageFile'), createArtist);
router.put('/:id', upload.single('imageFile'), updateArtist);
router.delete('/:id', deleteArtist);

export default router;
