import { createChildLogger } from '../lib/logger.js';

export interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export function createLogger(scope: string): Logger {
  const base = createChildLogger({ scope });
  return {
    info: (message: string, meta?: unknown) => base.info(message, meta),
    warn: (message: string, meta?: unknown) => base.warn(message, meta),
    error: (message: string, meta?: unknown) => base.error(message, meta),
  };
}
