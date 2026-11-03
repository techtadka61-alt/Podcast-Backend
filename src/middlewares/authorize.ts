import type { RequestHandler } from 'express';
import { Errors } from '../core/errors';
import { hasPermission, type Permission } from '../shared/rbac';

/** Requires every listed permission. Must run after `authenticate`. */
export const authorize =
  (...required: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw Errors.unauthorized();
    const { role } = req.user;
    if (!required.every((permission) => hasPermission(role, permission))) throw Errors.forbidden();
    next();
  };
