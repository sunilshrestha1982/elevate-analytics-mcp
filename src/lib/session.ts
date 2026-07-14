import crypto from 'crypto';

export const generateSessionId = () => crypto.randomBytes(32).toString('hex');
