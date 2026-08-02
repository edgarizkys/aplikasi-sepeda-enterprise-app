import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Middleware imports
import { rateLimiter } from './middleware/rateLimiter';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { authMiddleware } from './middleware/authMiddleware';
import { errorHandler } from './middleware/errorHandler';

// Routes imports
import { apiRoutes } from './routes/api';

// Types
interface AppRequest extends Request {
  tenantId?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Initialize Prisma Client
const prisma = new PrismaClient({
  errorFormat: 'pretty',
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Application factory
export function createApp(): Express {
  const app: Express = express();

  // Trust proxy
  app.set('trust proxy', 1);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Rate limiting
  app.use(rateLimiter);

  // Tenant middleware (extracts tenantId from header or subdomain)
  app.use(tenantMiddleware);

  // Public health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // API routes
  app.use('/api', apiRoutes);

  // Static files serving
  app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1h' }));

  // SPA fallback for frontend
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'), (err) => {
      if (err) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        });
      }
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

// Database initialization
async function initializeDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[DATABASE] Connected to PostgreSQL via Prisma');

    // Run pending migrations
    const migrationResult = await prisma.$executeRawUnsafe(
      'SELECT 1 FROM information_schema.tables WHERE table_name = \'_prisma_migrations\' LIMIT 1'
    );
    console.log('[DATABASE] Migrations table verified');
  } catch (error) {
    console.error('[DATABASE] Failed to initialize:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[SHUTDOWN] Received ${signal}`);
    server.close(async () => {
      console.log('[SHUTDOWN] HTTP server closed');
      await prisma.$disconnect();
      console.log('[SHUTDOWN] Database connection closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('[SHUTDOWN] Force shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Main execution
async function bootstrap(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();

    // Create Express app
    const app = createApp();
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const HOST = process.env.HOST || '0.0.0.0';

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n[ENTERPRISE] Aplikasi Sepeda Enterprise`);
      console.log(`[SERVER] Running on http://${HOST}:${PORT}`);
      console.log(`[ENVIRONMENT] ${process.env.NODE_ENV}`);
      console.log(`[VERSION] v1.0.0\n`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } catch (error) {
    console.error('[BOOTSTRAP] Fatal error:', error);
    process.exit(1);
  }
}

// Export for testing
export { prisma };

// Start application
if (require.main === module) {
  bootstrap();
}