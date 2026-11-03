export const Role = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/**
 * Reading published articles needs no permission: the site is public. Permissions cover what
 * requires an account (downloading PDFs) and what requires an administrator.
 */
export const Permission = {
  ARTICLE_READ_DRAFT: 'article:read:draft',
  ARTICLE_DOWNLOAD: 'article:download',
  ARTICLE_CREATE: 'article:create',
  ARTICLE_UPDATE: 'article:update',
  ARTICLE_DELETE: 'article:delete',
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const userPermissions: readonly Permission[] = [Permission.ARTICLE_DOWNLOAD];

/** Single source of truth for authorization. Roles map to permissions; code checks permissions. */
const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  [Role.USER]: new Set(userPermissions),
  [Role.ADMIN]: new Set<Permission>([...userPermissions, ...Object.values(Permission)]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}

export function isRole(value: unknown): value is Role {
  return value === Role.ADMIN || value === Role.USER;
}
