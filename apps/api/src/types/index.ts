import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import { errorHandler } from '@/middlewares/errorHandler';
import { requestLogger } from '@/middlewares/requestLogger';
import { authMiddleware } from '@/middlewares/auth';
import { tenantMiddleware } from '@/middlewares/tenant';

import authRoutes from '@/routes/auth.routes';
import bikeRoutes from '@/routes/bikes.routes';
import riderRoutes from '@/routes/riders.routes';
import rentalRoutes from '@/routes/rentals.routes';
import maintenanceRoutes from '@/routes/maintenance.routes';
import dashboardRoutes from '@/routes/dashboard.routes';
import analyticsRoutes from '@/routes/analytics.routes';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request Logging
app.use(requestLogger);

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Aplikasi Sepeda Enterprise is running',
    timestamp: new Date().toISOString(),
  });
});

// Public Routes
app.use('/api/v1/auth', authRoutes);

// Protected Routes with Tenant Middleware
app.use('/api/v1', authMiddleware, tenantMiddleware);

app.use('/api/v1/bikes', bikeRoutes);
app.use('/api/v1/riders', riderRoutes);
app.use('/api/v1/rentals', rentalRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan',
    },
  });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`[${NODE_ENV.toUpperCase()}] Aplikasi Sepeda Enterprise running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, prisma };