import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

type GoogleAccount = Prisma.GoogleAccountGetPayload<{}>;

export class GoogleAccountRepository {
  async create(data: Prisma.GoogleAccountCreateInput): Promise<GoogleAccount> {
    try {
      return await prisma.googleAccount.create({ data });
    } catch (error) {
      logger.error('Failed to create Google account', error);
      throw error;
    }
  }

  async findById(id: number): Promise<GoogleAccount | null> {
    try {
      return await prisma.googleAccount.findUnique({ where: { id } });
    } catch (error) {
      logger.error('Failed to find Google account by id', error);
      throw error;
    }
  }

  async findByGoogleUserId(googleUserId: string): Promise<GoogleAccount | null> {
    try {
      return await prisma.googleAccount.findUnique({ where: { googleUserId } });
    } catch (error) {
      logger.error('Failed to find Google account', error);
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<GoogleAccount[]> {
    try {
      return await prisma.googleAccount.findMany({ where: { userId } });
    } catch (error) {
      logger.error('Failed to find Google accounts by user', error);
      throw error;
    }
  }

  async updateAccessToken(id: number, accessToken: string | null, expiryDate: Date): Promise<GoogleAccount> {
    try {
      return await prisma.googleAccount.update({ where: { id }, data: { accessToken, expiryDate } });
    } catch (error) {
      logger.error('Failed to update Google account token', error);
      throw error;
    }
  }

  async updateAccount(id: number, data: Prisma.GoogleAccountUpdateInput): Promise<GoogleAccount> {
    try {
      return await prisma.googleAccount.update({ where: { id }, data });
    } catch (error) {
      logger.error('Failed to update Google account', error);
      throw error;
    }
  }

  async delete(id: number): Promise<GoogleAccount> {
    try {
      return await prisma.googleAccount.delete({ where: { id } });
    } catch (error) {
      logger.error('Failed to delete Google account', error);
      throw error;
    }
  }
}
