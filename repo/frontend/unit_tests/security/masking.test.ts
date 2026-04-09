import { describe, it, expect } from 'vitest';
import { maskValue, shouldMask, canRevealField } from '../../src/lib/security/masking';
import { UserRole } from '../../src/lib/types/enums';

const { Administrator, WarehouseManager, PickerPacker, Auditor } = UserRole;

describe('Masking', () => {
  describe('maskValue', () => {
    it('masks email format', () => {
      expect(maskValue('user@example.com', 'email')).toBe('••••@••••');
    });

    it('masks name format', () => {
      expect(maskValue('John Doe', 'name')).toBe('••••••');
    });

    it('masks default format', () => {
      expect(maskValue('some value')).toBe('••••••••');
      expect(maskValue('some value', 'default')).toBe('••••••••');
    });
  });

  describe('shouldMask', () => {
    it('masks email for Auditor', () => {
      expect(shouldMask('email', Auditor)).toBe(true);
    });

    it('masks email for PickerPacker', () => {
      expect(shouldMask('email', PickerPacker)).toBe(true);
    });

    it('does not mask email for Administrator', () => {
      expect(shouldMask('email', Administrator)).toBe(false);
    });

    it('masks displayName for Auditor', () => {
      expect(shouldMask('displayName', Auditor)).toBe(true);
    });

    it('does not mask displayName for WarehouseManager', () => {
      expect(shouldMask('displayName', WarehouseManager)).toBe(false);
    });

    it('returns false for unknown field', () => {
      expect(shouldMask('unknownField', Auditor)).toBe(false);
    });
  });

  describe('canRevealField', () => {
    it('Administrator can reveal email', () => {
      expect(canRevealField('email', Administrator)).toBe(true);
    });

    it('PickerPacker cannot reveal email', () => {
      expect(canRevealField('email', PickerPacker)).toBe(false);
    });

    it('Administrator can reveal attributes', () => {
      expect(canRevealField('attributes', Administrator)).toBe(true);
    });

    it('WarehouseManager cannot reveal attributes (sensitive)', () => {
      expect(canRevealField('attributes', WarehouseManager)).toBe(false);
    });

    it('returns true for unknown field (no restriction)', () => {
      expect(canRevealField('someFreeField', Auditor)).toBe(true);
    });
  });
});
