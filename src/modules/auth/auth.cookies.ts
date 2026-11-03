import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env';
import type { Session } from './auth.service';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
/** Readable by JavaScript on purpose: just a "probably signed in" flag, carries no secret. */
export const SESSION_HINT_COOKIE = 'session_hint';

const maxAge = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const base: CookieOptions = {
  httpOnly: true, // not readable from JavaScript => immune to token theft via XSS
  secure: env.COOKIE_SECURE,
};

const accessOptions: CookieOptions = { ...base, sameSite: 'lax', path: '/' };
const refreshOptions: CookieOptions = { ...base, sameSite: 'strict', path: REFRESH_COOKIE_PATH };
const hintOptions: CookieOptions = { httpOnly: false, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/' };

export function setAuthCookies(res: Response, session: Session): void {
  // The cookie outlives the JWT inside it on purpose: the JWT is short-lived (see
  // ACCESS_TOKEN_TTL_SECONDS) but the cookie's presence lets the frontend know a session
  // *may* be refreshable instead of bouncing the user to /login every 15 minutes.
  res.cookie(ACCESS_COOKIE, session.accessToken, { ...accessOptions, maxAge });
  // The refresh token is only ever sent to the auth endpoints.
  if (session.refreshToken) res.cookie(REFRESH_COOKIE, session.refreshToken, { ...refreshOptions, maxAge });
  // Public pages read this to decide whether to ask /auth/me who is signed in, so anonymous
  // visitors never trigger a pointless (and noisy) 401.
  res.cookie(SESSION_HINT_COOKIE, '1', { ...hintOptions, maxAge });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, accessOptions);
  res.clearCookie(REFRESH_COOKIE, refreshOptions);
  res.clearCookie(SESSION_HINT_COOKIE, hintOptions);
}
