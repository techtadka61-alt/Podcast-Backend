export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (message = 'Invalid request', details?: unknown) => new AppError(400, 'BAD_REQUEST', message, details),
  unauthorized: (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message: string, code = 'CONFLICT') => new AppError(409, code, message),
  payloadTooLarge: (message = 'Payload too large') => new AppError(413, 'PAYLOAD_TOO_LARGE', message),
  unsupportedMedia: (message = 'Unsupported file type') => new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', message),
} as const;
