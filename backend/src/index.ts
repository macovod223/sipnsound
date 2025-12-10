import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middlewares/error.middleware';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import trackRoutes from './routes/track.routes';
import trackAdminRoutes from './routes/track-admin.routes';
import playlistRoutes from './routes/playlist.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import artistRoutes from './routes/artist.routes';
import genreRoutes from './routes/genre.routes';
import aiDjRoutes from './routes/ai-dj.routes';

// Загрузка переменных окружения
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression()); // Gzip compression
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Static files (для локального хранения)
app.use('/uploads', express.static('uploads'));
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/admin/tracks', trackAdminRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/ai-dj', aiDjRoutes);

// 404 handler (catch-all для всех необработанных маршрутов)
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (должен быть последним)
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Sip&Sound Backend API v1.0.0`);
});

export default app;

