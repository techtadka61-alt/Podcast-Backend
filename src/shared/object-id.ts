import { z } from 'zod';

/** A MongoDB ObjectId in its 24-character hex form. Validating early keeps malformed ids out of queries. */
export const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');
