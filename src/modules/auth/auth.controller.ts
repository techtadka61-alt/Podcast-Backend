import type { Request, Response } from 'express';
import { AppError } from '../../core/errors';
import { clientMeta, noContent, ok, requireUser } from '../../shared/http';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './auth.cookies';
import { loginSchema, registerSchema } from './auth.schema';
import { authService } from './auth.service';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const session = await authService.register(registerSchema.parse(req.body), clientMeta(req));
    setAuthCookies(res, session);
    ok(res, { user: session.user }, 201);
  },

  async login(req: Request, res: Response): Promise<void> {
    const session = await authService.login(loginSchema.parse(req.body), clientMeta(req));
    setAuthCookies(res, session);
    ok(res, { user: session.user });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE] as string | undefined, clientMeta(req));
      setAuthCookies(res, session);
      ok(res, { user: session.user });
    } catch (err) {
      // A definitive auth failure must also drop the stale cookies, otherwise the frontend keeps
      // believing it has a session and loops between /login and the app.
      if (err instanceof AppError && err.status === 401) clearAuthCookies(res);
      throw err;
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    clearAuthCookies(res);
    noContent(res);
  },

  async me(req: Request, res: Response): Promise<void> {
    ok(res, { user: await authService.me(requireUser(req).id) });
  },
};
