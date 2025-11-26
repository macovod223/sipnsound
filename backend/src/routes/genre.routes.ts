import { Router } from 'express';
import { getGenres, getGenreById } from '../controllers/genre.controller';

const router = Router();

// GET /api/genres - Получить все жанры
router.get('/', getGenres);

// GET /api/genres/:id - Получить жанр по ID
router.get('/:id', getGenreById);

export default router;

