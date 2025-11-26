import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import prisma from '../config/database';

// Расширение типа Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

// Middleware для проверки JWT токена
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Получение токена из заголовка
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new AppError('JWT secret not configured', 500);
    }

    // Верификация токена
    const decoded = jwt.verify(token, jwtSecret) as { 
      id: string; 
      username: string;
      email: string;
    };

    // Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Добавление пользователя в request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

// Опциональная аутентификация (не выбрасывает ошибку если токена нет)
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET;

      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as { id: string };
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, username: true, email: true },
        });

        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Игнорируем ошибки для опциональной аутентификации
    next();
  }
};

