import type { ValidationResult, ValidationError } from '$lib/types/common';
import type { UserProfile } from '$lib/types/auth';
import { UserRole } from '$lib/types/enums';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateUsername(username: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!username || username.trim().length === 0) {
    errors.push(err('username', 'Username is required', 'required'));
    return makeResult(errors);
  }
  if (username.length < 3) {
    errors.push(err('username', 'Username must be at least 3 characters', 'too_short'));
  }
  if (username.length > 32) {
    errors.push(err('username', 'Username must be at most 32 characters', 'too_long'));
  }
  if (!USERNAME_PATTERN.test(username)) {
    errors.push(err('username', 'Username may only contain letters, numbers, and underscores', 'invalid_format'));
  }

  return makeResult(errors);
}

export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!password || password.length === 0) {
    errors.push(err('password', 'Password is required', 'required'));
    return makeResult(errors);
  }
  if (password.length < 8) {
    errors.push(err('password', 'Password must be at least 8 characters', 'too_short'));
  }
  if (!/[A-Z]/.test(password)) {
    errors.push(err('password', 'Password must contain at least one uppercase letter', 'missing_uppercase'));
  }
  if (!/[a-z]/.test(password)) {
    errors.push(err('password', 'Password must contain at least one lowercase letter', 'missing_lowercase'));
  }
  if (!/[0-9]/.test(password)) {
    errors.push(err('password', 'Password must contain at least one digit', 'missing_digit'));
  }

  return makeResult(errors);
}

export function validateUserCreation(data: {
  username: string;
  password: string;
  role: UserRole;
  profile: UserProfile;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const usernameResult = validateUsername(data.username);
  errors.push(...usernameResult.errors);

  const passwordResult = validatePassword(data.password);
  errors.push(...passwordResult.errors);

  if (!Object.values(UserRole).includes(data.role)) {
    errors.push(err('role', 'Invalid role', 'invalid_role'));
  }

  if (!data.profile?.displayName || data.profile.displayName.trim().length === 0) {
    errors.push(err('profile.displayName', 'Display name is required', 'required'));
  }

  return makeResult(errors);
}
