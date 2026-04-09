import type { ValidationResult, ValidationError } from '$lib/types/common';
import type { QualityResult } from '$lib/types/identity';
import {
  MIN_CAPTURE_WIDTH,
  MIN_CAPTURE_HEIGHT,
  BRIGHTNESS_RANGE,
  OCCLUSION_THRESHOLD,
} from '$lib/constants';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function validateResolution(width: number, height: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (width < MIN_CAPTURE_WIDTH) {
    errors.push(err('width', `Width must be at least ${MIN_CAPTURE_WIDTH}px`, 'insufficient_resolution'));
  }
  if (height < MIN_CAPTURE_HEIGHT) {
    errors.push(err('height', `Height must be at least ${MIN_CAPTURE_HEIGHT}px`, 'insufficient_resolution'));
  }

  return makeResult(errors);
}

export function validateBrightnessRange(meanLuminance: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (meanLuminance < BRIGHTNESS_RANGE.min) {
    errors.push(err(
      'brightness',
      `Brightness ${meanLuminance} is below minimum ${BRIGHTNESS_RANGE.min}`,
      'too_dark',
    ));
  }
  if (meanLuminance > BRIGHTNESS_RANGE.max) {
    errors.push(err(
      'brightness',
      `Brightness ${meanLuminance} is above maximum ${BRIGHTNESS_RANGE.max}`,
      'too_bright',
    ));
  }

  return makeResult(errors);
}

export function validateOcclusionScore(score: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (score >= OCCLUSION_THRESHOLD) {
    errors.push(err(
      'occlusion',
      `Occlusion score ${score} meets or exceeds threshold ${OCCLUSION_THRESHOLD}`,
      'heavy_occlusion',
    ));
  }

  return makeResult(errors);
}

export function validateQualityCheck(result: QualityResult): ValidationResult {
  const errors: ValidationError[] = [];

  if (!result.checkType) {
    errors.push(err('checkType', 'Check type is required', 'required'));
  }
  if (typeof result.passed !== 'boolean') {
    errors.push(err('passed', 'Pass status must be a boolean', 'invalid_type'));
  }
  if (!result.details || result.details.trim().length === 0) {
    errors.push(err('details', 'Details are required', 'required'));
  }

  return makeResult(errors);
}
