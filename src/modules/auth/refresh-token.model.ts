import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

export const REVOKE_REASONS = ['rotated', 'logout', 'reuse', 'admin'] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // All tokens descended from one login share a family; reuse of a rotated token revokes the family.
    familyId: { type: String, required: true },
    // SHA-256 of the opaque token. The raw token is never stored.
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: REVOKE_REASONS },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ familyId: 1 });
// TTL index: MongoDB deletes each token a day after it expires, so no cleanup job is needed.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & { _id: Types.ObjectId };
export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
