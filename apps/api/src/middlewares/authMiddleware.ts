import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';

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
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'sepeda-enterprise-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sepeda-enterprise-refresh-secret-key-2026';

export const verifyAccessToken = (token: string): AuthUser => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token telah kadaluarsa', 401, 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Token tidak valid', 401, 'INVALID_TOKEN');
    }
    throw new AppError('Gagal memverifikasi token', 401, 'TOKEN_VERIFICATION_FAILED');
  }
};

export const verifyRefreshToken = (token: string): AuthUser => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token telah kadaluarsa', 401, 'REFRESH_TOKEN_EXPIRED');
    }
    throw new AppError('Refresh token tidak valid', 401, 'INVALID_REFRESH_TOKEN');
  }
};

export const generateAccessToken = (user: Omit<AuthUser, 'iat' | 'exp'>): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (user: Omit<AuthUser, 'iat' | 'exp'>): string => {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Header Authorization tidak ditemukan', 401, 'MISSING_AUTH_HEADER');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Format Authorization header tidak valid', 401, 'INVALID_AUTH_FORMAT');
    }

    const token = parts[1];
    const user = verifyAccessToken(token);

    req.user = user;
    req.tenantId = user.tenantId;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        message: 'Terjadi kesalahan pada middleware autentikasi',
      },
    });
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const user = verifyAccessToken(token);
        req.user = user;
        req.tenantId = user.tenantId;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const requireRole = (...roles: AuthUser['role'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autentikasi diperlukan',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Anda tidak memiliki akses ke resource ini',
        },
      });
      return;
    }

    next();
  };
};

export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !req.tenantId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TENANT',
        message: 'ID tenant tidak ditemukan',
      },
    });
    return;
  }

  next();
};