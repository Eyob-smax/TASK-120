import { describe, it, expect } from 'vitest';
import { routes, routeConfig } from '../../src/routes/routes';
import { checkRouteAccess } from '../../src/app/route-guard';
import { UserRole } from '../../src/lib/types/enums';
import { setSession, clearSession } from '../../src/lib/stores/auth.store';

describe('Route Configuration', () => {
  it('routes map has all expected paths', () => {
    const paths = Object.keys(routes);
    expect(paths).toContain('/');
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/inventory');
    expect(paths).toContain('/inventory/ledger');
    expect(paths).toContain('/orders');
    expect(paths).toContain('/orders/waves');
    expect(paths).toContain('/files');
    expect(paths).toContain('/identity');
    expect(paths).toContain('/notifications');
    expect(paths).toContain('/settings');
    expect(paths).toContain('*');
  });

  it('routeConfig has labels for all nav routes', () => {
    for (const [path, config] of Object.entries(routeConfig)) {
      expect(config.label).toBeTruthy();
      expect(typeof config.showInNav).toBe('boolean');
    }
  });

  it('login route is not shown in nav', () => {
    expect(routeConfig['/'].showInNav).toBe(false);
  });

  it('dashboard route is shown in nav', () => {
    expect(routeConfig['/dashboard'].showInNav).toBe(true);
  });
});

describe('Route Guard', () => {
  afterEach(() => {
    clearSession();
  });

  it('allows access to public route / without auth', () => {
    expect(checkRouteAccess('/')).toBe(true);
  });

  it('blocks access to /dashboard without auth', () => {
    expect(checkRouteAccess('/dashboard')).toBe(false);
  });

  it('allows authenticated admin access to /dashboard', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    expect(checkRouteAccess('/dashboard')).toBe(true);
  });

  it('allows authenticated admin access to /identity', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    expect(checkRouteAccess('/identity')).toBe(true);
  });

  it('blocks auditor from /identity', () => {
    setSession({
      userId: 'u2',
      role: UserRole.Auditor,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    expect(checkRouteAccess('/identity')).toBe(false);
  });

  it('blocks picker/packer from /files', () => {
    setSession({
      userId: 'u3',
      role: UserRole.PickerPacker,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    expect(checkRouteAccess('/files')).toBe(false);
  });

  it('blocks locked session from protected routes', () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: true,
    });
    expect(checkRouteAccess('/dashboard')).toBe(false);
  });
});
