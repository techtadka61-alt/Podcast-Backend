import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { isProduction } from '../config/env';
import { AppError } from '../core/errors';
import { logger } from '../core/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

function body(code: string, message: string, details?: unknown) {
  return { success: false, error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (res.headersSent) {
    // Too late to send a JSON error (e.g. a file stream failed midway): tear the connection down.
    res.destroy();
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }

  if (err instanceof z.ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || '_';
      fields[path] ??= issue.message;
    }
    res.status(400).json(body('VALIDATION_ERROR', 'Validation failed', fields));
    return;
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res
      .status(tooLarge ? 413 : 400)
      .json(body(tooLarge ? 'PAYLOAD_TOO_LARGE' : 'UPLOAD_ERROR', tooLarge ? 'File is too large' : err.message));
    return;
  }

  // body-parser errors expose `type` and a safe 4xx `status`.
  const parserError = err as { type?: string; status?: number };
  if (parserError.type === 'entity.parse.failed') {
    res.status(400).json(body('BAD_REQUEST', 'Malformed JSON body'));
    return;
  }
  if (parserError.type === 'entity.too.large') {
    res.status(413).json(body('PAYLOAD_TOO_LARGE', 'Request body is too large'));
    return;
  }

  // Unknown: log everything, reveal nothing.
  logger.error({ err, reqId: req.id, method: req.method, url: req.originalUrl }, 'unhandled error');
  res
    .status(500)
    .json(body('INTERNAL_ERROR', isProduction ? 'Something went wrong' : err instanceof Error ? err.message : 'Error'));
};
