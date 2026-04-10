import type { Permission, RevealCapability } from '$lib/types/auth';
import { UserRole } from '$lib/types/enums';

const { Administrator, WarehouseManager, PickerPacker, Auditor } = UserRole;
const ALL_ROLES = [Administrator, WarehouseManager, PickerPacker, Auditor];

export const PERMISSION_MATRIX: Permission[] = [
  { capability: 'identity.reveal_basic', roles: [Administrator, WarehouseManager] },
  { capability: 'identity.reveal_sensitive', roles: [Administrator] },
  { capability: 'files.reveal_key_metadata', roles: [Administrator] },
  { capability: 'users.reveal_contact', roles: [Administrator] },
];

export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/': ALL_ROLES,
  '/dashboard': ALL_ROLES,
  '/inventory': [Administrator, WarehouseManager, Auditor],
  '/inventory/ledger': [Administrator, WarehouseManager, Auditor],
  '/orders': [Administrator, WarehouseManager, PickerPacker],
  '/orders/waves': [Administrator, WarehouseManager, PickerPacker],
  '/files': [Administrator, WarehouseManager, Auditor],
  '/identity': [Administrator],
  '/notifications': ALL_ROLES,
  '/settings': [Administrator],
};

export const MUTATION_ACCESS: Record<string, UserRole[]> = {
  'inventory.create': [Administrator, WarehouseManager],
  'inventory.update': [Administrator, WarehouseManager],
  'inventory.transfer': [Administrator, WarehouseManager],
  'inventory.count': [Administrator, WarehouseManager, PickerPacker],
  'orders.create': [Administrator, WarehouseManager],
  'orders.update': [Administrator, WarehouseManager],
  'orders.pick': [Administrator, WarehouseManager, PickerPacker],
  'orders.pack': [Administrator, WarehouseManager, PickerPacker],
  'waves.plan': [Administrator, WarehouseManager],
  'tasks.start': [Administrator, WarehouseManager, PickerPacker],
  'tasks.complete': [Administrator, WarehouseManager, PickerPacker],
  'files.upload': [Administrator, WarehouseManager],
  'files.delete': [Administrator, WarehouseManager],
  'files.restore': [Administrator, WarehouseManager],
  'identity.enroll': [Administrator],
  'identity.import': [Administrator],
  'users.create': [Administrator],
  'users.update': [Administrator],
  'settings.update': [Administrator],
  'discrepancy.report': [Administrator, WarehouseManager, PickerPacker],
  'discrepancy.review': [Administrator, WarehouseManager],
  'discrepancy.resolve': [Administrator, WarehouseManager],
};

export function canAccess(role: UserRole, route: string): boolean {
  const allowed = ROUTE_ACCESS[route];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function canMutate(role: UserRole, action: string): boolean {
  const allowed = MUTATION_ACCESS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function canReveal(role: UserRole, capability: RevealCapability): boolean {
  const entry = PERMISSION_MATRIX.find(p => p.capability === capability);
  if (!entry) return false;
  return entry.roles.includes(role);
}

export function isReadOnly(role: UserRole): boolean {
  return role === UserRole.Auditor;
}
