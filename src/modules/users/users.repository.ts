import { isValidObjectId } from 'mongoose';
import type { Role } from '../../shared/rbac';
import { UserModel, type UserDoc } from './user.model';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

function toUser(doc: UserDoc): User {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    role: doc.role as Role,
    isActive: doc.isActive,
    lastLoginAt: doc.lastLoginAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

const toUserWithHash = (doc: UserDoc): UserWithHash => ({ ...toUser(doc), passwordHash: doc.passwordHash });

const DUPLICATE_KEY = 11000;

export const usersRepository = {
  async findByEmail(email: string): Promise<UserWithHash | null> {
    const doc = await UserModel.findOne({ email }).lean<UserDoc>();
    return doc ? toUserWithHash(doc) : null;
  },

  async findById(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  },

  /** Returns null when the email is already taken (duplicate key), so callers need no error codes. */
  async create(input: { email: string; name: string; passwordHash: string; role: Role }): Promise<User | null> {
    try {
      const doc = await UserModel.create(input);
      return toUser(doc.toObject() as UserDoc);
    } catch (err) {
      if ((err as { code?: number }).code === DUPLICATE_KEY) return null;
      throw err;
    }
  },

  async touchLastLogin(id: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });
  },

  /** Newest first, `limit + 1` rows so the caller can tell whether another page exists. */
  async list(params: { cursor?: string; limit: number }): Promise<User[]> {
    const docs = await UserModel.find(params.cursor ? { _id: { $lt: params.cursor } } : {})
      .sort({ _id: -1 })
      .limit(params.limit + 1)
      .lean<UserDoc[]>();
    return docs.map(toUser);
  },

  async update(id: string, patch: { role?: Role; isActive?: boolean }): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  },
};
