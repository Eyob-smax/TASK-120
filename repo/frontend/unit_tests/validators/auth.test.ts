import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  validatePassword,
  validateUserCreation,
} from '../../src/lib/validators/auth.validators';
import { UserRole } from '../../src/lib/types/enums';

describe('Auth Validators', () => {
  describe('validateUsername', () => {
    it('accepts valid username', () => {
      expect(validateUsername('admin_user').valid).toBe(true);
    });

    it('accepts 3-character username', () => {
      expect(validateUsername('abc').valid).toBe(true);
    });

    it('rejects empty string', () => {
      const result = validateUsername('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'required')).toBe(true);
    });

    it('rejects 2-character username', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'too_short')).toBe(true);
    });

    it('rejects username with special characters', () => {
      const result = validateUsername('admin@user');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'invalid_format')).toBe(true);
    });

    it('rejects username with spaces', () => {
      expect(validateUsername('admin user').valid).toBe(false);
    });

    it('accepts username with underscores and numbers', () => {
      expect(validateUsername('user_123').valid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('accepts valid password', () => {
      expect(validatePassword('AdminPass1').valid).toBe(true);
    });

    it('rejects 7-character password', () => {
      const result = validatePassword('Admin1a');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'too_short')).toBe(true);
    });

    it('rejects password without uppercase', () => {
      const result = validatePassword('adminpass1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'missing_uppercase')).toBe(true);
    });

    it('rejects password without lowercase', () => {
      const result = validatePassword('ADMINPASS1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'missing_lowercase')).toBe(true);
    });

    it('rejects password without digit', () => {
      const result = validatePassword('AdminPass');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'missing_digit')).toBe(true);
    });

    it('rejects empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'required')).toBe(true);
    });
  });

  describe('validateUserCreation', () => {
    it('accepts valid creation data', () => {
      const result = validateUserCreation({
        username: 'newuser',
        password: 'SecurePass1',
        role: UserRole.WarehouseManager,
        profile: { displayName: 'New User' },
      });
      expect(result.valid).toBe(true);
    });

    it('aggregates username and password errors', () => {
      const result = validateUserCreation({
        username: 'ab',
        password: 'short',
        role: UserRole.PickerPacker,
        profile: { displayName: 'Test' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('rejects missing display name', () => {
      const result = validateUserCreation({
        username: 'validuser',
        password: 'SecurePass1',
        role: UserRole.Auditor,
        profile: { displayName: '' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'profile.displayName')).toBe(true);
    });
  });
});
