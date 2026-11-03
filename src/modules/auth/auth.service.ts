import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { Errors } from '../../core/errors';
import { logger } from '../../core/logger';
import { Role } from '../../shared/rbac';
import { usersRepository, type User, type UserWithHash } from '../users/users.repository';
import type { LoginInput, RegisterInput } from './auth.schema';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password.service';
import { refreshTokenRepository } from './refresh-token.repository';
import { generateRefreshToken, hashToken, signAccessToken } from './token.service';

export interface ClientMeta {
  ip: string;
  userAgent: string;
}

export interface Session {
  user: User;
  accessToken: string;
  /** Absent when a concurrent refresh already rotated the token (see refresh()). */
  refreshToken?: string;
}

/**
 * Two browser tabs refreshing at the same moment present the same refresh token. The loser would
 * look like token theft. Within this window we treat a just-rotated token as a benign race and
 * only mint a new access token (the winning tab's Set-Cookie already carries the new refresh token).
 * Only tokens revoked by rotation qualify: logout, reuse detection and admin revocation never do.
 */
const ROTATION_GRACE_MS = 10_000;

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function startSession(user: User, meta: ClientMeta): Promise<Session> {
  const refresh = generateRefreshToken();
  await refreshTokenRepository.insert({
    userId: user.id,
    familyId: randomUUID(),
    tokenHash: refresh.hash,
    expiresAt: refreshExpiry(),
    ...meta,
  });
  return { user, accessToken: signAccessToken(user), refreshToken: refresh.raw };
}

function stripHash({ passwordHash: _passwordHash, ...user }: UserWithHash): User {
  return user;
}

export const authService = {
  async register(input: RegisterInput, meta: ClientMeta): Promise<Session> {
    const passwordHash = await hashPassword(input.password);
    // Self-registration can only ever create a regular user. Admins are provisioned out of band.
    const user = await usersRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: Role.USER,
    });
    if (!user) throw Errors.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    return startSession(user, meta);
  },

  async login(input: LoginInput, meta: ClientMeta): Promise<Session> {
    const found = await usersRepository.findByEmail(input.email);
    const passwordOk = found
      ? await verifyPassword(found.passwordHash, input.password)
      : (await verifyAgainstDummy(input.password), false);

    if (!found || !passwordOk || !found.isActive) {
      // One generic message for unknown email, wrong password and disabled account.
      throw Errors.unauthorized('Invalid email or password');
    }

    const session = await startSession(stripHash(found), meta);
    void usersRepository
      .touchLastLogin(found.id)
      .catch((err: unknown) => logger.warn({ err }, 'failed to update last login'));
    return session;
  },

  /** Rotating refresh with reuse detection. */
  async refresh(rawToken: string | undefined, meta: ClientMeta): Promise<Session> {
    if (!rawToken) throw Errors.unauthorized('No session');
    const tokenHash = hashToken(rawToken);

    const consumed = await refreshTokenRepository.consumeActive(tokenHash);
    if (consumed) {
      const user = await usersRepository.findById(consumed.userId);
      if (!user?.isActive) throw Errors.unauthorized('Account is disabled');

      const next = generateRefreshToken();
      await refreshTokenRepository.insert({
        userId: user.id,
        familyId: consumed.familyId,
        tokenHash: next.hash,
        expiresAt: refreshExpiry(),
        ...meta,
      });
      return { user, accessToken: signAccessToken(user), refreshToken: next.raw };
    }

    // Not consumable: unknown, expired or already used. Work out which.
    const record = await refreshTokenRepository.findByHash(tokenHash);
    if (!record || record.expiresAt.getTime() <= Date.now()) throw Errors.unauthorized('Session expired');

    if (
      record.revokedReason === 'rotated' &&
      record.revokedAt &&
      Date.now() - record.revokedAt.getTime() <= ROTATION_GRACE_MS
    ) {
      const user = await usersRepository.findById(record.userId);
      if (!user?.isActive) throw Errors.unauthorized('Account is disabled');
      return { user, accessToken: signAccessToken(user) };
    }

    // A rotated or revoked token came back long after the fact: assume it was stolen and kill the family.
    logger.warn({ userId: record.userId, familyId: record.familyId, ip: meta.ip }, 'refresh token reuse detected');
    await refreshTokenRepository.revokeFamily(record.familyId);
    throw Errors.unauthorized('Session expired');
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await refreshTokenRepository.revokeByHash(hashToken(rawToken));
  },

  async me(userId: string): Promise<User> {
    const user = await usersRepository.findById(userId);
    if (!user?.isActive) throw Errors.unauthorized('Account is disabled');
    return user;
  },
};
