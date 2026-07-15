import { prisma, disconnectPrisma } from '../lib/prisma.js';
import { createChildLogger } from '../lib/logger.js';
import { UserRepository } from '../repositories/userRepository.js';
import { GoogleAccountRepository } from '../repositories/googleAccountRepository.js';
import { OAuthSessionRepository } from '../repositories/oauthSessionRepository.js';
import { observeDatabaseLatency } from '../lib/metrics.js';
import { traceAsync } from '../lib/tracing.js';

const logger = createChildLogger({ scope: 'database' });

export class DatabaseService {
  public readonly userRepository = new UserRepository();
  public readonly googleAccountRepository = new GoogleAccountRepository();
  public readonly oauthSessionRepository = new OAuthSessionRepository();

  async checkHealth() {
    return traceAsync('database', 'database.health_check', {}, async () => {
      const startedAt = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        const latencyMs = Date.now() - startedAt;
        observeDatabaseLatency('health_check', 'ok', latencyMs);
        logger.info('Database health check latency', {
          operation: 'health_check',
          databaseLatencyMs: latencyMs,
          status: 'ok',
        });
        return {
          status: 'ok',
          service: 'database',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        observeDatabaseLatency('health_check', 'error', latencyMs);
        logger.error('Database health check failed', {
          operation: 'health_check',
          databaseLatencyMs: latencyMs,
          status: 'error',
          error,
        });
        return {
          status: 'error',
          service: 'database',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown database error',
        };
      }
    });
  }

  async disconnect() {
    await disconnectPrisma();
  }
}

export const databaseService = new DatabaseService();
