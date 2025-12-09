import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Создание Prisma клиента
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Флаг для отслеживания состояния подключения
let isConnected = false;
let isConnecting = false;

// Подключение к БД
const connectDatabase = async () => {
  if (isConnected || isConnecting) {
    return;
  }
  
  isConnecting = true;
  
  try {
    await prisma.$connect();
    isConnected = true;
    isConnecting = false;
    logger.info('Database connected successfully');
  } catch (error) {
    isConnecting = false;
    logger.error('Database connection failed:', error);
    // Не завершаем процесс сразу, даем возможность повторить попытку
    throw error;
  }
};

// Инициализация подключения
connectDatabase().catch((error) => {
  logger.error('Failed to connect to database on startup:', error);
  // В development режиме не завершаем процесс, чтобы можно было исправить проблему
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown - только один обработчик
let shutdownHandler: (() => Promise<void>) | null = null;

if (!shutdownHandler) {
  shutdownHandler = async () => {
    if (isConnected) {
      try {
        await prisma.$disconnect();
        isConnected = false;
        logger.info('Database disconnected');
      } catch (error) {
        logger.error('Error disconnecting from database:', error);
      }
    }
  };
  
  process.on('beforeExit', shutdownHandler);
  process.on('SIGINT', async () => {
    await shutdownHandler!();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await shutdownHandler!();
    process.exit(0);
  });
}

export default prisma;

