/**
 * Middleware для проверки админских прав
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Проверяем, является ли пользователь админом
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Простая проверка - если username содержит 'admin', то это админ
    // В реальном проекте лучше добавить поле isAdmin в схему
    if (!user.username.toLowerCase().includes('admin')) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    // Добавляем информацию о пользователе в запрос
    (req as any).adminUser = user;
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
