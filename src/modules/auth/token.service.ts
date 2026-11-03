import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env';
import { Errors } from '../../core/errors';
import { objectIdSchema } from '../../shared/object-id';
import { isRole, type Role } from '../../shared/rbac';

const AUDIENCE = 'article-portal-web';

const claimsSchema = z.object({
  sub: objectIdSchema,
  role: z.string().refine(isRole),
});

export interface AccessClaims {
  sub: string;
  role: Role;
}

export function signAccessToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: env.JWT_ISSUER,
    audience: AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    // Pin the algorithm: never let the token header choose how it is verified.
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: AUDIENCE,
    });
    const claims = claimsSchema.parse(payload);
    return { sub: claims.sub, role: claims.role as Role };
  } catch {
    throw Errors.unauthorized('Invalid or expired token');
  }
}

/** Opaque, high-entropy refresh token. Only its SHA-256 is persisted. */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
