import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

if (nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

prisma.$connect().catch((error) => {
  logger.error('Failed to connect to Prisma', error);
});

export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};
