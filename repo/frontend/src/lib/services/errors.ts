import type { ValidationResult, ValidationError } from '$lib/types/common';

export class ServiceError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    field?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ServiceError {
  constructor(message = 'Authorization denied', field?: string) {
    super(message, 'AUTHORIZATION_DENIED', field);
    this.name = 'AuthorizationError';
  }
}

export class ValidationServiceError extends ServiceError {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message, 'VALIDATION_FAILED');
    this.name = 'ValidationServiceError';
    this.errors = errors;
  }
}

export class ConflictError extends ServiceError {
  constructor(message = 'Version conflict detected', field?: string) {
    super(message, 'VERSION_CONFLICT', field);
    this.name = 'ConflictError';
  }
}

export function toValidationResult(error: ServiceError): ValidationResult {
  if (error instanceof ValidationServiceError) {
    return { valid: false, errors: error.errors };
  }
  return {
    valid: false,
    errors: [{ field: error.field ?? '_', message: error.message, code: error.code }],
  };
}
