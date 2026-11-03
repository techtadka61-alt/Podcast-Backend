import type { Request, Response } from 'express';
import { Errors } from '../core/errors';
import type { Role } from './rbac';

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function noContent(res: Response): void {
  res.status(204).end();
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

/** Narrow `req.user` for handlers that sit behind `authenticate`. */
export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw Errors.unauthorized();
  return req.user;
}

export function clientMeta(req: Request): { ip: string; userAgent: string } {
  return {
    ip: req.ip ?? 'unknown',
    userAgent: (req.get('user-agent') ?? '').slice(0, 255),
  };
}
