import { describe, expect, it } from 'vitest';
import { AppError } from '../src/core/errors';
import { objectIdSchema } from '../src/shared/object-id';
import { decodeCursor, encodeCursor, toPage } from '../src/shared/pagination';

const ID_A = '507f1f77bcf86cd799439013';
const ID_B = '507f1f77bcf86cd799439012';
const ID_C = '507f1f77bcf86cd799439011';

describe('pagination', () => {
  it('round-trips cursors', () => {
    expect(decodeCursor(encodeCursor(ID_A))).toBe(ID_A);
  });

  it('rejects tampered cursors (query-operator shaped input never reaches a query)', () => {
    const evil = Buffer.from('{"$gt":""}', 'utf8').toString('base64url');
    expect(() => decodeCursor(evil)).toThrow(AppError);
    expect(() => decodeCursor('%%%')).toThrow(AppError);
  });

  it('emits nextCursor only when more rows exist', () => {
    const rows = [{ id: ID_A }, { id: ID_B }, { id: ID_C }];
    const withMore = toPage(rows, 2, (r) => r.id, (r) => r.id);
    expect(withMore.items).toEqual([ID_A, ID_B]);
    expect(decodeCursor(withMore.nextCursor as string)).toBe(ID_B);

    const last = toPage(rows, 3, (r) => r.id, (r) => r.id);
    expect(last.items).toHaveLength(3);
    expect(last.nextCursor).toBeNull();
  });
});

describe('objectIdSchema', () => {
  it('accepts a 24-char hex id', () => {
    expect(objectIdSchema.safeParse(ID_A).success).toBe(true);
  });

  it('rejects anything else, including NoSQL operator objects', () => {
    expect(objectIdSchema.safeParse('123').success).toBe(false);
    expect(objectIdSchema.safeParse('zzzzzzzzzzzzzzzzzzzzzzzz').success).toBe(false);
    expect(objectIdSchema.safeParse({ $ne: null }).success).toBe(false);
  });
});
