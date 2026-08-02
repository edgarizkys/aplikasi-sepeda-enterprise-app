import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Security middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Rate limiter middleware
const rateLimitMap = new Map<string, number[]>();

const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip)!.filter(time => time > windowStart);
  
  if (requests.length >= 100) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.',
      },
    });
  }

  requests.push(now);
  rateLimitMap.set(ip, requests);
  next();
};

app.use(rateLimiter);

// Tenant extraction middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default';
  (req as any).tenantId = tenantId;
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// API Routes placeholder
app.use('/api/bikes', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    meta: {
      page: 1,
      limit: 20,
      total: 0,
    },
  });
});

app.use('/api/riders', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    meta: {
      page: 1,
      limit: 20,
      total: 0,
    },
  });
});

app.use('/api/rentals', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    meta: {
      page: 1,
      limit: 20,
      total: 0,
    },
  });
});

app.use('/api/maintenance', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    meta: {
      page: 1,
      limit: 20,
      total: 0,
    },
  });
});

// SPA fallback
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Terjadi kesalahan pada server.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan.',
    },
  });
});

// Initialize server
const initializeServer = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connected successfully');

    // Start listening
    app.listen(PORT, () => {
      console.log(`[ENTERPRISE] Aplikasi Sepeda Enterprise berjalan di port ${PORT}`);
      console.log(`[ENTERPRISE] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[ENTERPRISE] Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('✗ Failed to initialize server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start application
initializeServer();

export default app;