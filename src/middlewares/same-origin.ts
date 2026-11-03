import type { RequestHandler } from 'express';
import { allowedOrigins } from '../config/env';
import { AppError } from '../core/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated state-changing requests.
 *
 * Layers: SameSite cookies (primary), plus this check. Browsers always attach `Origin` to
 * cross-origin POST/PUT/PATCH/DELETE (including multipart forms, which skip CORS preflight), so a
 * mismatching Origin or a `cross-site` Fetch-Metadata header is rejected. Non-browser clients
 * (curl, k6, server-to-server) send neither header and are authenticated by their credentials.
 */
export const requireSameOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const fetchSite = req.get('sec-fetch-site');

  if (origin !== undefined && !allowedOrigins.includes(origin)) {
    throw new AppError(403, 'CSRF_ORIGIN_MISMATCH', 'Cross-origin request blocked');
  }
  if (origin === undefined && fetchSite === 'cross-site') {
    throw new AppError(403, 'CSRF_ORIGIN_MISMATCH', 'Cross-origin request blocked');
  }
  next();
};
