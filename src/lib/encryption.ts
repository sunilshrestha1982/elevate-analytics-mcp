import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getEnv } from '../config/env.js';

const algorithm = 'aes-256-gcm';

const getKey = () => {
  const secret = getEnv().ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is required');
  }

  return createHash('sha256').update(secret).digest();
};

export const encryptValue = (value: string): string => {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptValue = (value: string): string => {
  const buffer = Buffer.from(value, 'base64');
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const key = getKey();
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
