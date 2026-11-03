import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { Role } from '../../shared/rbac';

const userSchema = new Schema(
  {
    // Stored lowercase; the unique index below makes registration race-safe.
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), default: Role.USER, required: true },
    isActive: { type: Boolean, default: true, required: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const UserModel = model('User', userSchema);
