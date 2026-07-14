import crypto from 'crypto';

export const generateRandomString = (length = 32) => crypto.randomBytes(length).toString('hex');
