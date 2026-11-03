import { describe, expect, it } from 'vitest';
import { hasPermission, Permission, Role } from '../src/shared/rbac';

describe('rbac', () => {
  it('lets users download PDFs but nothing else', () => {
    expect(hasPermission(Role.USER, Permission.ARTICLE_DOWNLOAD)).toBe(true);
    expect(hasPermission(Role.USER, Permission.ARTICLE_CREATE)).toBe(false);
    expect(hasPermission(Role.USER, Permission.ARTICLE_READ_DRAFT)).toBe(false);
    expect(hasPermission(Role.USER, Permission.USER_MANAGE)).toBe(false);
  });

  it('grants admins every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(hasPermission(Role.ADMIN, permission)).toBe(true);
    }
  });
});
