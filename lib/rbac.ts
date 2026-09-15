import { Role } from '@prisma/client';

export const PERMISSIONS = {
  dashboard: ['OWNER','ADMIN','MANAGER','EDITOR','ORDER_MANAGER','VIEWER'],
  productsRead: ['OWNER','ADMIN','MANAGER','EDITOR','VIEWER'],
  productsWrite: ['OWNER','ADMIN','MANAGER','EDITOR'],
  ordersRead: ['OWNER','ADMIN','MANAGER','ORDER_MANAGER','VIEWER'],
  ordersWrite: ['OWNER','ADMIN','MANAGER','ORDER_MANAGER'],
  customersRead: ['OWNER','ADMIN','MANAGER','ORDER_MANAGER','VIEWER'],
  marketingWrite: ['OWNER','ADMIN','MANAGER','EDITOR'],
  settingsWrite: ['OWNER','ADMIN'],
  usersWrite: ['OWNER','ADMIN'],
  securityRead: ['OWNER','ADMIN'],
} as const;
export type Permission = keyof typeof PERMISSIONS;
export function can(role: Role | string, permission: Permission) { return (PERMISSIONS[permission] as readonly string[]).includes(role); }
