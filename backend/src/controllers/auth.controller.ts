import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../middlewares/error.middleware';

// Генерация JWT токена
const generateToken = (userId: string, username: string, email: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new AppError('JWT secret not configured', 500);
  }

  return jwt.sign(
    { id: userId, username, email },
    jwtSecret,
    { expiresIn: jwtExpiresIn } as jwt.SignOptions
  );
};

// POST /api/auth/register
export const register = asyncHandler(
  async (req: Request, res: Response) => {
    // Валидация
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Проверка существования пользователя
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      throw new AppError('Username or email already exists', 400);
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        displayName: username,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Генерация токена
    const token = generateToken(user.id, user.username, user.email);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
    return;
  }
);

// POST /api/auth/login
export const login = asyncHandler(
  async (req: Request, res: Response) => {
    // Валидация
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid username or password', 401);
    }

    // Генерация токена
    const token = generateToken(user.id, user.username, user.email);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
    return;
  }
);

// GET /api/auth/me
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  }
);

