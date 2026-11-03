import { Router } from 'express';
import { pingDatabase } from '../../core/db';
import { logger } from '../../core/logger';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/healthz', async (_req, res) => {
    try {
      await pingDatabase();
      res.json({ status: 'ok' });
    } catch (err) {
      logger.warn({ err }, 'health check failed');
      res.status(503).json({ status: 'unavailable' });
    }
  });

  return router;
}
