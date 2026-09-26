import { Role } from '@prisma/client';

/**
 * Centralized admin authorization matrix.
 * Keep these permissions aligned with the User.role enum in prisma/schema.prisma.
 */
export const PERMISSIONS = {
  dashboard: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'ORDER_MANAGER', 'VIEWER'],

  productsRead: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'],
  productsWrite: ['OWNER', 'ADMIN', 'MANAGER', 'EDITOR'],

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
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
