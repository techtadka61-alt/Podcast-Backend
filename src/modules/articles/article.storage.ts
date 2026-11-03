import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env';
import { Errors } from '../../core/errors';
import { logger } from '../../core/logger';

const rootDir = path.resolve(env.UPLOAD_DIR);
export const tmpDir = path.join(rootDir, 'tmp');
export const articlesDir = path.join(rootDir, 'articles');

const KEY_PATTERN = /^[0-9a-f-]{36}\.pdf$/;

/**
 * Local-disk object store. All API instances and nginx mount the same volume, so any instance can
 * accept an upload and nginx can serve it. To move to S3/GCS, replace this module's four functions
 * (commit/remove/ensureDirs + a signed-URL redirect in the download controller); nothing else changes.
 */
export const articleStorage = {
  async ensureDirs(): Promise<void> {
    await Promise.all([mkdir(tmpDir, { recursive: true }), mkdir(articlesDir, { recursive: true })]);
  },

  /** Verifies the file really is a PDF by magic bytes; the client-declared MIME type proves nothing. */
  async assertPdf(filePath: string): Promise<void> {
    const handle = await open(filePath, constants.O_RDONLY);
    try {
      const header = Buffer.alloc(5);
      const { bytesRead } = await handle.read(header, 0, 5, 0);
      if (bytesRead < 5 || header.toString('latin1') !== '%PDF-') {
        throw Errors.unsupportedMedia('The uploaded file is not a valid PDF');
      }
    } finally {
      await handle.close();
    }
  },

  /** Atomically moves a validated temp upload into the article store and returns its object key. */
  async commit(tmpPath: string): Promise<string> {
    const key = `${randomUUID()}.pdf`;
    await rename(tmpPath, path.join(articlesDir, key));
    await chmod(path.join(articlesDir, key), 0o644);
    return key;
  },

  async discardTemp(tmpPath: string): Promise<void> {
    await unlink(tmpPath).catch(() => undefined);
  },

  async remove(key: string): Promise<void> {
    if (!KEY_PATTERN.test(key)) return;
    await unlink(path.join(articlesDir, key)).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') logger.warn({ err, key }, 'failed to delete article file');
    });
  },
};
