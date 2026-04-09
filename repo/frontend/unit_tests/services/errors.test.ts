import { describe, it, expect } from 'vitest';
import {
  ServiceError,
  AuthenticationError,
  AuthorizationError,
  ValidationServiceError,
  ConflictError,
  toValidationResult,
} from '../../src/lib/services/errors';

describe('Service Errors', () => {
  it('ServiceError has correct code and message', () => {
    const err = new ServiceError('test error', 'TEST_CODE', 'field1');
    expect(err.message).toBe('test error');
    expect(err.code).toBe('TEST_CODE');
    expect(err.field).toBe('field1');
    expect(err).toBeInstanceOf(Error);
  });

  it('AuthenticationError has correct default code', () => {
    const err = new AuthenticationError();
    expect(err.code).toBe('AUTHENTICATION_FAILED');
    expect(err.message).toBe('Authentication failed');
    expect(err).toBeInstanceOf(ServiceError);
  });

  it('AuthorizationError has correct default code', () => {
    const err = new AuthorizationError();
    expect(err.code).toBe('AUTHORIZATION_DENIED');
    expect(err).toBeInstanceOf(ServiceError);
  });

  it('ValidationServiceError carries errors array', () => {
    const errors = [{ field: 'name', message: 'Required', code: 'required' }];
    const err = new ValidationServiceError('Validation failed', errors);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.errors).toEqual(errors);
  });

  it('ConflictError has correct default code', () => {
    const err = new ConflictError();
    expect(err.code).toBe('VERSION_CONFLICT');
  });

  describe('toValidationResult', () => {
    it('converts ServiceError to ValidationResult', () => {
      const err = new ServiceError('bad thing', 'BAD', 'someField');
      const result = toValidationResult(err);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('BAD');
      expect(result.errors[0].field).toBe('someField');
    });

    it('preserves ValidationServiceError errors', () => {
      const errors = [
        { field: 'a', message: 'err1', code: 'c1' },
        { field: 'b', message: 'err2', code: 'c2' },
      ];
      const err = new ValidationServiceError('fail', errors);
      const result = toValidationResult(err);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it('uses _ as default field when none provided', () => {
      const err = new ServiceError('msg', 'CODE');
      const result = toValidationResult(err);
      expect(result.errors[0].field).toBe('_');
    });
  });
});
