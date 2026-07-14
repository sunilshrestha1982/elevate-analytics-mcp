import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

type OAuthSession = Prisma.OAuthSessionGetPayload<{}>;

export class OAuthSessionRepository {
  async create(data: Prisma.OAuthSessionCreateInput): Promise<OAuthSession> {
    try {
      return await prisma.oAuthSession.create({ data });
    } catch (error) {
      logger.error('Failed to create OAuth session', error);
      throw error;
    }
  }

  async findByState(state: string): Promise<OAuthSession | null> {
    try {
      return await prisma.oAuthSession.findUnique({ where: { state } });
    } catch (error) {
      logger.error('Failed to find OAuth session', error);
      throw error;
    }
  }

  async delete(id: number): Promise<OAuthSession> {
    try {
      return await prisma.oAuthSession.delete({ where: { id } });
    } catch (error) {
      logger.error('Failed to delete OAuth session', error);
      throw error;
    }
  }
}
