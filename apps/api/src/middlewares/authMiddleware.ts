import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  tenantId: string;
  name: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Allow demo/test access with default user
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          id: '1',
          email: 'demo@aplikasisepeda.com',
          role: 'admin',
          tenantId: '1',
          name: 'Demo User'
        };
        return next();
      }
      throw new AppError('Token tidak ditemukan', 401, 'TOKEN_NOT_FOUND');
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token telah kadaluarsa', 401, 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Token tidak valid', 401, 'INVALID_TOKEN');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Gagal autentikasi', 401, 'AUTH_FAILED');
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('Autentikasi diperlukan', 401, 'AUTHENTICATION_REQUIRED');
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Autentikasi diperlukan', 401, 'AUTHENTICATION_REQUIRED');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError('Anda tidak memiliki akses ke resource ini', 403, 'INSUFFICIENT_PERMISSIONS');
    }
    next();
  };
};

export const generateAccessToken = (user: Omit<AuthUser, 'iat' | 'exp'>): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (user: Omit<AuthUser, 'iat' | 'exp'>): string => {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token: string): AuthUser => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser;
  } catch (error) {
    throw new AppError('Refresh token tidak valid', 401, 'INVALID_REFRESH_TOKEN');
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};