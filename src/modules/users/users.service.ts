import { Errors } from '../../core/errors';
import { decodeCursor, toPage, type Page } from '../../shared/pagination';
import type { Role } from '../../shared/rbac';
import { refreshTokenRepository } from '../auth/refresh-token.repository';
import { usersRepository, type User } from './users.repository';

export const usersService = {
  async list(query: { cursor?: string; limit: number }): Promise<Page<User>> {
    const rows = await usersRepository.list({
      cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
      limit: query.limit,
    });
    return toPage(rows, query.limit, (user) => user, (user) => user.id);
  },

  async update(actorId: string, targetId: string, patch: { role?: Role; isActive?: boolean }): Promise<User> {
    // Prevents an admin from locking themselves out or leaving the system without administrators.
    if (actorId === targetId) throw Errors.badRequest('You cannot change your own role or status');

    const user = await usersRepository.update(targetId, patch);
    if (!user) throw Errors.notFound('User not found');

    // Stops the user from refreshing their session. Their current access token (JWT) stays valid
    // until it expires, because nothing checks the database on each request.
    await refreshTokenRepository.revokeAllForUser(targetId);
    return user;
  },
};
