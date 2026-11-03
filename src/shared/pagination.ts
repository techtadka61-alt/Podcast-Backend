import { Errors } from '../core/errors';
import { OBJECT_ID_PATTERN } from './object-id';

/**
 * Keyset (a.k.a. seek) pagination: `{ _id: { $lt: cursor } }` sorted by `_id` descending.
 * Cost is the same on page 1 and page 1000, unlike skip() which walks past every skipped document.
 * ObjectIds are unique and increase with creation time, so `_id` is a stable sort key.
 * The cursor is opaque to clients so the strategy can change without breaking them.
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!OBJECT_ID_PATTERN.test(decoded)) throw Errors.badRequest('Invalid cursor');
  return decoded;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Rows are fetched with `limit + 1` to learn whether another page exists without a count query. */
export function toPage<R, T>(rows: R[], limit: number, map: (row: R) => T, idOf: (row: R) => string): Page<T> {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map(map),
    nextCursor: hasMore && last ? encodeCursor(idOf(last)) : null,
  };
}
