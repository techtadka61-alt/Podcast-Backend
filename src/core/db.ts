import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from './logger';

mongoose.connection.on('error', (err) => logger.error({ err }, 'mongodb connection error'));
mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB,
    serverSelectionTimeoutMS: 5_000,
    // Indexes are created explicitly by ensureIndexes() so start-up knows when they are ready.
    autoIndex: false,
  });
}

export async function pingDatabase(): Promise<void> {
  await mongoose.connection.db?.admin().ping();
}

export async function closeDatabase(): Promise<void> {
  await mongoose.disconnect();
}
