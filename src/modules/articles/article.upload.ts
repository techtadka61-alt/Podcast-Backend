import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from '../../config/env';
import { Errors } from '../../core/errors';
import { tmpDir } from './article.storage';

/**
 * Uploads stream straight to disk (never buffered in memory), so 20 MB x N concurrent uploads
 * cannot exhaust the heap. The temp file is validated, then atomically renamed into the store.
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    // Never trust the client-supplied filename for anything on disk.
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.upload`),
  }),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 16 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(Errors.unsupportedMedia('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const uploadPdf = upload.single('file');
