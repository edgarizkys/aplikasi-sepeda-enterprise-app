import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { ZodError } from 'zod';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Types
interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface AuthPayload {
  userId: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      tenantId?: string;
    }
  }
}

// Error Classes
class BaseAppError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, BaseAppError.prototype);
  }
}

class ValidationError extends BaseAppError {
  constructor(message: string = 'Validasi data gagal') {
    super(message, 400, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

class NotFoundError extends BaseAppError {
  constructor(message: string = 'Data tidak ditemukan') {
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

class UnauthorizedError extends BaseAppError {
  constructor(message: string = 'Akses tidak diizinkan') {
    super(message, 401, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

class ForbiddenError extends BaseAppError {
  constructor(message: string = 'Anda tidak memiliki izin') {
    super(message, 403, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

// Utility Functions
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const sendResponse = <T>(res: Response, statusCode: number, success: boolean, data?: T, error?: { code: string; message: string }, meta?: { page: number; limit: number; total: number }) => {
  const response: ApiResponse<T> = {
    success,
    ...(data && { data }),
    ...(error && { error }),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
};

// Middleware
const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedError('Token tidak ditemukan');
  }

  // Mock JWT verification (implement with jsonwebtoken in production)
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as AuthPayload;
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    throw new UnauthorizedError('Token tidak valid');
  }
});

const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    throw new UnauthorizedError('Tenant ID tidak ditemukan');
  }

  req.tenantId = tenantId;
  next();
};

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return sendResponse(res, 400, false, undefined, {
      code: 'VALIDATION_ERROR',
      message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
  }

  if (err instanceof BaseAppError) {
    return sendResponse(res, err.statusCode, false, undefined, {
      code: err.code,
      message: err.message,
    });
  }

  sendResponse(res, 500, false, undefined, {
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan pada server',
  });
};

// Initialize Express App
const app: Express = express();

// Global Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  sendResponse(res, 200, true, { status: 'OK', timestamp: new Date().toISOString() });
});

// Auth Routes (Basic Implementation)
app.post(
  '/api/auth/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, tenantId } = req.body;

    if (!email || !password || !name || !tenantId) {
      throw new ValidationError('Email, password, name, dan tenantId diperlukan');
    }

    // Mock user creation (implement with bcryptjs in production)
    const user = {
      id: '1',
      email,
      name,
      tenantId,
      createdAt: new Date(),
    };

    sendResponse(res, 201, true, user);
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email dan password diperlukan');
    }

    // Mock token generation (implement with jsonwebtoken in production)
    const mockToken = Buffer.from(
      JSON.stringify({
        userId: '1',
        tenantId: 'tenant-1',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      })
    ).toString('base64');

    const token = `header.${mockToken}.signature`;

    sendResponse(res, 200, true, {
      accessToken: token,
      refreshToken: 'refresh-token-mock',
      user: { id: '1', email, name: 'User' },
    });
  })
);

// Items Routes (CRUD)
app.get(
  '/api/items',
  tenantMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Mock data - replace with actual Prisma query
    const items = [
      { id: 1, name: 'Item 1', description: 'Sample', status: 'active', tenantId: req.tenantId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
    ];

    const total = 1;

    sendResponse(res, 200, true, items, undefined, { page, limit, total });
  })
);

app.get(
  '/api/items/:id',
  tenantMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('ID diperlukan');
    }

    // Mock data
    const item = {
      id: parseInt(id),
      name: 'Item 1',
      description: 'Sample',
      status: 'active',
      tenantId: req.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    if (!item) {
      throw new NotFoundError('Item tidak ditemukan');
    }

    sendResponse(res, 200, true, item);
  })
);

app.post(
  '/api/items',
  tenantMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, status } = req.body;

    if (!name || !description || !status) {
      throw new ValidationError('Nama, deskripsi, dan status diperlukan');
    }

    // Mock data
    const newItem = {
      id: 2,
      name,
      description,
      status,
      tenantId: req.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    sendResponse(res, 201, true, newItem);
  })
);

app.put(
  '/api/items/:id',
  tenantMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!id) {
      throw new ValidationError('ID diperlukan');
    }

    if (!name && !description && !status) {
      throw new ValidationError('Minimal satu field harus diperbarui');
    }

    // Mock data
    const updatedItem = {
      id: parseInt(id),
      name: name || 'Item 1',
      description: description || 'Sample',
      status: status || 'active',
      tenantId: req.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    sendResponse(res, 200, true, updatedItem);
  })
);

app.delete(
  '/api/items/:id',
  tenantMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('ID diperlukan');
    }

    // Mock soft delete
    sendResponse(res, 200, true, { message: 'Item berhasil dihapus' });
  })
);

// Analytics Routes
app.get(
  '/api/analytics/dashboard',
  tenantMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    // Mock analytics data
    const analytics = {
      totalItems: 100,
      activeItems: 85,
      inactiveItems: 15,
      monthlyGrowth: 12.5,
      chartData: [
        { month: 'Jan', value: 50 },
        { month: 'Feb', value: 65 },
        { month: 'Mar', value: 78 },
      ],
    };

    sendResponse(res, 200, true, analytics);
  })
);

// 404 Handler
app.use((req: Request, res: Response) => {
  sendResponse(res, 404, false, undefined, {
    code: 'NOT_FOUND',
    message: 'Route tidak ditemukan',
  });
});

// Global Error Handler
app.use(errorHandler);

// Server Initialization
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server berjalan di http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Gagal memulai server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

// Start Server
startServer();

export default app;