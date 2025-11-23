/**
 * Middleware для проверки админских прав
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Проверяем, является ли пользователь админом
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Простая проверка - если username содержит 'admin', то это админ
    // В реальном проекте лучше добавить поле isAdmin в схему
    if (!user.username.toLowerCase().includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Добавляем информацию о пользователе в запрос
    (req as any).adminUser = user;
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
