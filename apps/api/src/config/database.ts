import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function initializeDatabase() {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('[DB] Connected successfully');
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export { prisma };