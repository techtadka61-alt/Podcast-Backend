import type { Request, RequestHandler } from 'express';
import { Errors } from '../core/errors';
import { ACCESS_COOKIE } from '../modules/auth/auth.cookies';
import { verifyAccessToken } from '../modules/auth/token.service';

function extractToken(req: Request): string | undefined {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

/** Verifies the JWT (no DB lookup) and attaches `req.user`. Rejects with 401 when missing or invalid. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw Errors.unauthorized();

  const claims = verifyAccessToken(token);
  req.user = { id: claims.sub, role: claims.role };
  next();
};

/** For public routes that behave differently for signed-in users. A bad or expired token means anonymous. */
export const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const claims = verifyAccessToken(token);
      req.user = { id: claims.sub, role: claims.role };
    } catch {
      // Treated as anonymous; the client will refresh its session when it needs to.
    }
  }
  next();
};
