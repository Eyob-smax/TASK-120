import { describe, it, expect } from 'vitest';
import {
  validateResolution,
  validateBrightnessRange,
  validateOcclusionScore,
  validateQualityCheck,
} from '../../src/lib/validators/identity.validators';
import { QualityCheckResult } from '../../src/lib/types/enums';

describe('Identity Validators', () => {
  describe('validateResolution', () => {
    it('passes at exactly 1280x720', () => {
      expect(validateResolution(1280, 720).valid).toBe(true);
    });

    it('passes at higher resolution', () => {
      expect(validateResolution(1920, 1080).valid).toBe(true);
    });

    it('fails at 1279x720', () => {
      const result = validateResolution(1279, 720);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'insufficient_resolution')).toBe(true);
    });

    it('fails at 1280x719', () => {
      const result = validateResolution(1280, 719);
      expect(result.valid).toBe(false);
    });

    it('fails at both dimensions below minimum', () => {
      const result = validateResolution(640, 480);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('validateBrightnessRange', () => {
    it('passes at minimum (40)', () => {
      expect(validateBrightnessRange(40).valid).toBe(true);
    });

    it('passes at maximum (220)', () => {
      expect(validateBrightnessRange(220).valid).toBe(true);
    });

    it('passes in middle range', () => {
      expect(validateBrightnessRange(130).valid).toBe(true);
    });

    it('fails below minimum (39)', () => {
      const result = validateBrightnessRange(39);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'too_dark')).toBe(true);
    });

    it('fails above maximum (221)', () => {
      const result = validateBrightnessRange(221);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'too_bright')).toBe(true);
    });
  });

  describe('validateOcclusionScore', () => {
    it('passes at 0.69 (below threshold)', () => {
      expect(validateOcclusionScore(0.69).valid).toBe(true);
    });

    it('fails at 0.7 (at threshold = heavy occlusion)', () => {
      const result = validateOcclusionScore(0.7);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'heavy_occlusion')).toBe(true);
    });

    it('fails at 0.71 (above threshold)', () => {
      expect(validateOcclusionScore(0.71).valid).toBe(false);
    });

    it('passes at 0.0', () => {
      expect(validateOcclusionScore(0.0).valid).toBe(true);
    });
  });

  describe('validateQualityCheck', () => {
    it('accepts a well-formed result', () => {
      const result = validateQualityCheck({
        checkType: QualityCheckResult.Pass,
        passed: true,
        details: 'All checks passed',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects empty details', () => {
      const result = validateQualityCheck({
        checkType: QualityCheckResult.Pass,
        passed: true,
        details: '',
      });
      expect(result.valid).toBe(false);
    });
  });
});
