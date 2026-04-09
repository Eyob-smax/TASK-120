import { describe, it, expect } from 'vitest';
import { canAccess, canMutate, canReveal, isReadOnly } from '../../src/lib/security/permissions';
import { UserRole } from '../../src/lib/types/enums';

const { Administrator, WarehouseManager, PickerPacker, Auditor } = UserRole;

describe('Permissions', () => {
  describe('canAccess (route)', () => {
    it('Administrator can access all defined routes', () => {
      const routes = ['/', '/dashboard', '/inventory', '/orders', '/files', '/identity', '/notifications', '/settings'];
      for (const route of routes) {
        expect(canAccess(Administrator, route)).toBe(true);
      }
    });

    it('Auditor cannot access /identity', () => {
      expect(canAccess(Auditor, '/identity')).toBe(false);
    });

    it('Auditor can access /inventory and /inventory/ledger', () => {
      expect(canAccess(Auditor, '/inventory')).toBe(true);
      expect(canAccess(Auditor, '/inventory/ledger')).toBe(true);
    });

    it('PickerPacker cannot access /files', () => {
      expect(canAccess(PickerPacker, '/files')).toBe(false);
    });

    it('PickerPacker can access /orders', () => {
      expect(canAccess(PickerPacker, '/orders')).toBe(true);
    });

    it('returns false for unknown route', () => {
      expect(canAccess(Administrator, '/unknown')).toBe(false);
    });
  });

  describe('canMutate (action)', () => {
    it('Auditor cannot mutate anything', () => {
      const actions = ['inventory.create', 'orders.create', 'files.upload', 'users.create'];
      for (const action of actions) {
        expect(canMutate(Auditor, action)).toBe(false);
      }
    });

    it('PickerPacker can pick but not create orders', () => {
      expect(canMutate(PickerPacker, 'orders.pick')).toBe(true);
      expect(canMutate(PickerPacker, 'orders.create')).toBe(false);
    });

    it('Administrator can perform all mutations', () => {
      expect(canMutate(Administrator, 'users.create')).toBe(true);
      expect(canMutate(Administrator, 'identity.enroll')).toBe(true);
      expect(canMutate(Administrator, 'files.upload')).toBe(true);
    });

    it('WarehouseManager can manage inventory but not users', () => {
      expect(canMutate(WarehouseManager, 'inventory.create')).toBe(true);
      expect(canMutate(WarehouseManager, 'users.create')).toBe(false);
    });

    it('returns false for unknown action', () => {
      expect(canMutate(Administrator, 'unknown.action')).toBe(false);
    });
  });

  describe('canReveal', () => {
    it('Administrator can reveal all capabilities', () => {
      expect(canReveal(Administrator, 'identity.reveal_basic')).toBe(true);
      expect(canReveal(Administrator, 'identity.reveal_sensitive')).toBe(true);
      expect(canReveal(Administrator, 'files.reveal_key_metadata')).toBe(true);
      expect(canReveal(Administrator, 'users.reveal_contact')).toBe(true);
    });

    it('WarehouseManager can reveal basic but not sensitive', () => {
      expect(canReveal(WarehouseManager, 'identity.reveal_basic')).toBe(true);
      expect(canReveal(WarehouseManager, 'identity.reveal_sensitive')).toBe(false);
    });

    it('Auditor cannot reveal any capability', () => {
      expect(canReveal(Auditor, 'identity.reveal_basic')).toBe(false);
      expect(canReveal(Auditor, 'identity.reveal_sensitive')).toBe(false);
      expect(canReveal(Auditor, 'files.reveal_key_metadata')).toBe(false);
      expect(canReveal(Auditor, 'users.reveal_contact')).toBe(false);
    });

    it('PickerPacker cannot reveal anything', () => {
      expect(canReveal(PickerPacker, 'identity.reveal_basic')).toBe(false);
    });
  });

  describe('isReadOnly', () => {
    it('returns true only for Auditor', () => {
      expect(isReadOnly(Auditor)).toBe(true);
      expect(isReadOnly(Administrator)).toBe(false);
      expect(isReadOnly(WarehouseManager)).toBe(false);
      expect(isReadOnly(PickerPacker)).toBe(false);
    });
  });
});
