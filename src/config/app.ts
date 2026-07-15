import { getEnv } from './env.js';

export const appConfig = {
  name: 'elevate-analytics-mcp',
  version: '0.1.0',
  get port() {
    return getEnv().PORT;
  },
};
