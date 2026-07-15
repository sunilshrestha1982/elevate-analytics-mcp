#!/usr/bin/env node

const requiredAll = [];
const requiredProd = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'MCP_API_KEY',
  'GCP_PROJECT_ID',
  'GCP_REGION',
  'GCP_SERVICE_NAME',
];

const env = process.env;
const nodeEnv = env.NODE_ENV ?? 'development';
const missing = [];
const weak = [];

for (const key of requiredAll) {
  if (!env[key]) missing.push(key);
}

if (nodeEnv !== 'test' && !env.DATABASE_URL) {
  missing.push('DATABASE_URL');
}

if (nodeEnv === 'production') {
  for (const key of requiredProd) {
    if (!env[key]) missing.push(key);
  }

  const minLengths = {
    JWT_SECRET: 32,
    SESSION_SECRET: 32,
    ENCRYPTION_KEY: 32,
    MCP_API_KEY: 24,
  };

  for (const [key, minLength] of Object.entries(minLengths)) {
    const value = env[key];
    if (value && value.length < minLength) {
      weak.push(`${key} (min ${minLength} chars)`);
    }
  }
}

if (missing.length > 0) {
  console.error(`Missing required environment variables for ${nodeEnv}: ${missing.join(', ')}`);
  process.exit(1);
}

if (weak.length > 0) {
  console.error(`Weak secrets detected: ${weak.join(', ')}`);
  process.exit(1);
}

console.log('Environment validation passed.');
