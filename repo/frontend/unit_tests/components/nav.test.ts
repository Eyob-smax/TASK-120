import { describe, it, expect } from 'vitest';
import { routeConfig } from '../../src/routes/routes';
import { canAccess } from '../../src/lib/security/permissions';
import { UserRole } from '../../src/lib/types/enums';

const { Administrator, WarehouseManager, PickerPacker, Auditor } = UserRole;

function getNavItemsForRole(role: UserRole): string[] {
  return Object.entries(routeConfig)
    .filter(([path, config]) => config.showInNav && canAccess(role, path))
    .map(([path]) => path);
}

describe('NavRail visibility by role', () => {
  it('Administrator sees all nav items', () => {
    const items = getNavItemsForRole(Administrator);
    expect(items).toContain('/dashboard');
    expect(items).toContain('/inventory');
    expect(items).toContain('/orders');
    expect(items).toContain('/files');
    expect(items).toContain('/identity');
    expect(items).toContain('/notifications');
    expect(items).toContain('/settings');
  });

  it('Auditor does not see /identity', () => {
    const items = getNavItemsForRole(Auditor);
    expect(items).not.toContain('/identity');
    expect(items).toContain('/inventory');
    expect(items).toContain('/notifications');
  });

  it('Auditor does not see /files', () => {
    const items = getNavItemsForRole(Auditor);
    expect(items).not.toContain('/files');
  });

  it('Auditor does not see /orders', () => {
    const items = getNavItemsForRole(Auditor);
    expect(items).not.toContain('/orders');
  });

  it('PickerPacker does not see /files', () => {
    const items = getNavItemsForRole(PickerPacker);
    expect(items).not.toContain('/files');
  });

  it('PickerPacker does not see /identity', () => {
    const items = getNavItemsForRole(PickerPacker);
    expect(items).not.toContain('/identity');
  });

  it('PickerPacker sees /orders', () => {
    const items = getNavItemsForRole(PickerPacker);
    expect(items).toContain('/orders');
  });

  it('WarehouseManager sees inventory, orders, files but not identity', () => {
    const items = getNavItemsForRole(WarehouseManager);
    expect(items).toContain('/inventory');
    expect(items).toContain('/orders');
    expect(items).toContain('/files');
    expect(items).not.toContain('/identity');
  });
});
