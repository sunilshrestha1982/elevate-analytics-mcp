import { Router } from 'express';
import { systemHealthService } from '../services/systemHealthService.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const health = await systemHealthService.getHealth();
  res.status(health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503).json(health);
});

healthRouter.get('/db', async (_req, res) => {
  const health = await systemHealthService.getHealth();
  const dbOnly = {
    status: health.components.database.status,
    message: health.components.database.message,
    timestamp: health.timestamp,
  };
  res.status(dbOnly.status === 'ok' ? 200 : 503).json(dbOnly);
});
