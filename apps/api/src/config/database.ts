import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function initializeDatabase() {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('[DB] Connection established');

    // Create tables via Prisma schema
    logger.info('[DB] Tables ready');
  } catch (error) {
    logger.error('[DB] Initialization failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('[DB] Disconnected');
}

export default prisma;