import { Role } from '@prisma/client';

/**
 * Centralized admin authorization matrix.
 * Keep all admin capabilities here so API routes do not need to maintain
 * their own role lists.
 */
export const PERMISSIONS = {
  dashboard: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'ORDER_MANAGER', 'VIEWER'],

  productsRead: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'],
  productsWrite: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'],

  inventoryRead: ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'],
  inventoryWrite: ['OWNER', 'ADMIN', 'MANAGER'],

  ordersRead: ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'],
  ordersWrite: ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER'],

  customersRead: ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'],

  marketingRead: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'],
  marketingWrite: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'],

  giftCardsRead: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'],
  giftCardsWrite: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'],

  reviewsRead: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'],
  reviewsWrite: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'],

  usersRead: ['OWNER', 'ADMIN'],
  usersWrite: ['OWNER', 'ADMIN'],

  securityRead: ['OWNER', 'ADMIN'],

  settingsRead: ['OWNER', 'ADMIN'],
  settingsWrite: ['OWNER', 'ADMIN'],

  shippingRead: ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  shippingWrite: ['OWNER', 'ADMIN', 'MANAGER'],

  faqRead: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'],
  faqWrite: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'],

  contactRead: ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'],
  contactWrite: ['OWNER', 'ADMIN', 'MANAGER', 'ORDER_MANAGER'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/**
 * Returns the role names allowed for a permission.
 * Kept as a compatibility helper for routes that still use requireUser(roles).
 */
export function rolesFor(permission: Permission): string[] {
  return [...PERMISSIONS[permission]];
}

/**
 * Route-level guard for an already authenticated user.
 * Authentication and authorization remain separate concerns: use requireUser()
 * first, then this helper to check the requested capability.
 */
export function requirePermission(
  user: { role?: Role | string | null } | null | undefined,
  permission: Permission,
): boolean {
  return can(user?.role, permission);
}
