import { prisma } from '../src/lib/prisma.js';
import { logger } from '../src/lib/logger.js';

async function main() {
  const existingUser = await prisma.user.findFirst();

  if (existingUser) {
    logger.info('Seed data already exists; skipping seed');
    return;
  }

  await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
      avatar: 'https://example.com/avatar.png',
    },
  });

  logger.info('Seed data created');
}

main()
  .catch((error) => {
    logger.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
