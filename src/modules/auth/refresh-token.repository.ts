import { RefreshTokenModel, type RefreshTokenDoc, type RevokeReason } from './refresh-token.model';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokeReason | null;
}

const toRecord = (doc: RefreshTokenDoc): RefreshTokenRecord => ({
  id: String(doc._id),
  userId: String(doc.userId),
  familyId: doc.familyId,
  expiresAt: doc.expiresAt,
  revokedAt: doc.revokedAt ?? null,
  revokedReason: (doc.revokedReason as RevokeReason | undefined) ?? null,
});

const revoke = (filter: Record<string, unknown>, reason: RevokeReason) =>
  RefreshTokenModel.updateMany({ ...filter, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } });

export const refreshTokenRepository = {
  async insert(input: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    ip: string;
    userAgent: string;
  }): Promise<void> {
    await RefreshTokenModel.create(input);
  },

  /**
   * Atomically consume a token: a single findOneAndUpdate both validates (not revoked, not expired)
   * and revokes it, so two concurrent refreshes can never both win.
   */
  async consumeActive(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const doc = await RefreshTokenModel.findOneAndUpdate(
      { tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { revokedAt: new Date(), revokedReason: 'rotated' } },
      { new: true },
    ).lean<RefreshTokenDoc>();
    return doc ? toRecord(doc) : null;
  },

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash }).lean<RefreshTokenDoc>();
    return doc ? toRecord(doc) : null;
  },

  async revokeFamily(familyId: string): Promise<void> {
    await revoke({ familyId }, 'reuse');
  },

  async revokeByHash(tokenHash: string): Promise<void> {
    await revoke({ tokenHash }, 'logout');
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await revoke({ userId }, 'admin');
  },
};
