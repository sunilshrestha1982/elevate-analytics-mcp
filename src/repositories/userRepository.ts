import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

type User = Prisma.UserGetPayload<{}>;

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      return await prisma.user.findUnique({ where: { id } });
    } catch (error) {
      logger.error('Failed to find user by id', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({ where: { email } });
    } catch (error) {
      logger.error('Failed to find user by email', error);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    } catch (error) {
      logger.error('Failed to fetch users', error);
      throw error;
    }
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      return await prisma.user.update({ where: { id }, data });
    } catch (error) {
      logger.error('Failed to update user', error);
      throw error;
    }
  }

  async delete(id: number): Promise<User> {
    try {
      return await prisma.user.delete({ where: { id } });
    } catch (error) {
      logger.error('Failed to delete user', error);
      throw error;
    }
  }
}
