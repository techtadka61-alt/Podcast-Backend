import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './core/logger';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { requireSameOrigin } from './middlewares/same-origin';
import { createArticleRouter } from './modules/articles/article.routes';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createHealthRouter } from './modules/health/health.routes';
import { createAdminUsersRouter } from './modules/users/users.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(createHealthRouter());
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  // Tiny body limit: JSON endpoints take a few hundred bytes. Uploads go through multer, not here.
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api/v1', requireSameOrigin);
  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1/articles', createArticleRouter());
  app.use('/api/v1/admin/users', createAdminUsersRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
