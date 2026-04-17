import { describe, it, expect } from 'vitest';
import {
  checkResolution,
  checkBrightness,
  checkOcclusion,
  runAllQualityChecks,
} from '../../src/modules/identity/quality.service';
import { QualityCheckResult } from '../../src/lib/types/enums';
import {
  MIN_CAPTURE_WIDTH,
  MIN_CAPTURE_HEIGHT,
  BRIGHTNESS_RANGE,
} from '../../src/lib/constants';

/**
 * Build an ImageData of given dims. `fill` is a function that for each pixel returns
 * [r, g, b, a]. Defaults to mid-gray with alpha 255.
 */
function makeImageData(width: number, height: number, fill?: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill ? fill(x, y) : [128, 128, 128, 255];
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  // jsdom does not always provide ImageData - fall back to a plain object shaped like ImageData
  try {
    return new ImageData(data, width, height);
  } catch {
    return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
  }
}

describe('Quality Service', () => {
  describe('checkResolution', () => {
    it('passes when dimensions meet minimum', () => {
      const result = checkResolution(MIN_CAPTURE_WIDTH, MIN_CAPTURE_HEIGHT);
      expect(result.passed).toBe(true);
      expect(result.checkType).toBe(QualityCheckResult.Pass);
    });

    it('passes when dimensions exceed minimum', () => {
      const result = checkResolution(MIN_CAPTURE_WIDTH + 100, MIN_CAPTURE_HEIGHT + 100);
      expect(result.passed).toBe(true);
    });

    it('fails when width below minimum', () => {
      const result = checkResolution(MIN_CAPTURE_WIDTH - 1, MIN_CAPTURE_HEIGHT);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailResolution);
    });

    it('fails when height below minimum', () => {
      const result = checkResolution(MIN_CAPTURE_WIDTH, MIN_CAPTURE_HEIGHT - 1);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailResolution);
    });

    it('returns measuredValue as pixel area', () => {
      const result = checkResolution(640, 480);
      expect(result.measuredValue).toBe(640 * 480);
    });
  });

  describe('checkBrightness', () => {
    const W = 10;
    const H = 10;

    it('passes for mid-range luminance', () => {
      const mid = Math.round((BRIGHTNESS_RANGE.min + BRIGHTNESS_RANGE.max) / 2);
      const img = makeImageData(W, H, () => [mid, mid, mid, 255]);
      const result = checkBrightness(img);
      expect(result.passed).toBe(true);
      expect(result.checkType).toBe(QualityCheckResult.Pass);
    });

    it('fails for too dark image', () => {
      const dark = Math.max(0, BRIGHTNESS_RANGE.min - 10);
      const img = makeImageData(W, H, () => [dark, dark, dark, 255]);
      const result = checkBrightness(img);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailBrightness);
      expect(result.details.toLowerCase()).toContain('too dark');
    });

    it('fails for too bright image', () => {
      const bright = Math.min(255, BRIGHTNESS_RANGE.max + 10);
      const img = makeImageData(W, H, () => [bright, bright, bright, 255]);
      const result = checkBrightness(img);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailBrightness);
      expect(result.details.toLowerCase()).toContain('too bright');
    });
  });

  describe('checkOcclusion', () => {
    it('passes for a high-edge-density pattern', () => {
      // Strong horizontal gradient — (x-1) and (x+1) always differ → high edge density
      const img = makeImageData(32, 32, (x, y) => {
        const v = ((x + y) * 40) % 256;
        return [v, v, v, 255];
      });
      const result = checkOcclusion(img);
      expect(result.passed).toBe(true);
    });

    it('fails for a blank uniform image (no edges = heavy occlusion)', () => {
      const img = makeImageData(32, 32, () => [128, 128, 128, 255]);
      const result = checkOcclusion(img);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailOcclusion);
    });
  });

  describe('runAllQualityChecks', () => {
    it('returns exactly three results in the expected order', () => {
      const img = makeImageData(8, 8);
      const results = runAllQualityChecks(img, 640, 480);
      expect(results).toHaveLength(3);
      // First is resolution
      expect(
        [QualityCheckResult.Pass, QualityCheckResult.FailResolution].includes(results[0].checkType),
      ).toBe(true);
    });
  });
});
