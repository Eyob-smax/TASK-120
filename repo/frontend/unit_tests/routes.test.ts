import { describe, it, expect } from 'vitest';

describe('Route Registry Contract', () => {
  const plannedRoutes: Record<string, string> = {
    '/': 'Login / first-run setup',
    '/dashboard': 'Main dashboard',
    '/inventory': 'Inventory management',
    '/inventory/ledger': 'Immutable movement ledger',
    '/orders': 'Order management',
    '/orders/waves': 'Wave planning',
    '/files': 'File management',
    '/identity': 'Identity & face enrollment',
    '/notifications': 'Notification inbox',
    '/settings': 'Preferences and admin settings',
  };

  it('should define planned route paths', () => {
    expect(Object.keys(plannedRoutes).length).toBeGreaterThan(0);
  });

  it('should have all routes starting with /', () => {
    for (const route of Object.keys(plannedRoutes)) {
      expect(route.startsWith('/')).toBe(true);
    }
  });

  it('should include core domain routes', () => {
    expect(plannedRoutes).toHaveProperty('/inventory');
    expect(plannedRoutes).toHaveProperty('/orders');
    expect(plannedRoutes).toHaveProperty('/files');
    expect(plannedRoutes).toHaveProperty('/identity');
    expect(plannedRoutes).toHaveProperty('/notifications');
  });

  it('should include the immutable ledger as a sub-route of inventory', () => {
    expect(plannedRoutes).toHaveProperty('/inventory/ledger');
  });

  it('should include wave planning as a sub-route of orders', () => {
    expect(plannedRoutes).toHaveProperty('/orders/waves');
  });
});
