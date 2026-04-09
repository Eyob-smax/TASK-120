import { describe, it, expect } from 'vitest';
import { checkResolution, checkBrightness, checkOcclusion } from '../../src/modules/identity/quality.service';
import { generateVector } from '../../src/modules/identity/vector.service';
import { QualityCheckResult } from '../../src/lib/types/enums';
import { MIN_CAPTURE_WIDTH, MIN_CAPTURE_HEIGHT, BRIGHTNESS_RANGE, OCCLUSION_THRESHOLD } from '../../src/lib/constants';

function makeImageData(width: number, height: number, brightness = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = brightness;     // R
    data[i + 1] = brightness; // G
    data[i + 2] = brightness; // B
    data[i + 3] = 255;        // A
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('Quality Checks', () => {
  describe('checkResolution', () => {
    it('passes at 1280x720', () => {
      const result = checkResolution(1280, 720);
      expect(result.passed).toBe(true);
      expect(result.checkType).toBe(QualityCheckResult.Pass);
    });

    it('fails below 720p', () => {
      const result = checkResolution(640, 480);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailResolution);
    });

    it('passes at higher resolution', () => {
      expect(checkResolution(1920, 1080).passed).toBe(true);
    });
  });

  describe('checkBrightness', () => {
    it('passes at mid-range brightness', () => {
      const img = makeImageData(100, 100, 130);
      const result = checkBrightness(img);
      expect(result.passed).toBe(true);
    });

    it('fails when too dark', () => {
      const img = makeImageData(100, 100, 10);
      const result = checkBrightness(img);
      expect(result.passed).toBe(false);
      expect(result.checkType).toBe(QualityCheckResult.FailBrightness);
    });

    it('fails when too bright', () => {
      const img = makeImageData(100, 100, 250);
      const result = checkBrightness(img);
      expect(result.passed).toBe(false);
    });

    it('passes at minimum brightness boundary', () => {
      const img = makeImageData(100, 100, BRIGHTNESS_RANGE.min);
      expect(checkBrightness(img).passed).toBe(true);
    });

    it('passes at maximum brightness boundary', () => {
      const img = makeImageData(100, 100, BRIGHTNESS_RANGE.max);
      expect(checkBrightness(img).passed).toBe(true);
    });
  });

  describe('checkOcclusion', () => {
    it('returns a quality result with score', () => {
      const img = makeImageData(100, 100, 128);
      const result = checkOcclusion(img);
      expect(result.measuredValue).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('uniform image suggests high occlusion', () => {
      // Completely uniform = no edges = high occlusion score
      const img = makeImageData(100, 100, 128);
      const result = checkOcclusion(img);
      expect(result.checkType).toBe(QualityCheckResult.FailOcclusion);
    });
  });
});

describe('Vector Generation', () => {
  it('generates a 128-element Float32Array', () => {
    const img = makeImageData(200, 200, 128);
    const vector = generateVector(img);
    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(128);
  });

  it('produces different vectors for different images', () => {
    const img1 = makeImageData(200, 200, 100);
    const img2 = makeImageData(200, 200, 200);
    const v1 = generateVector(img1);
    const v2 = generateVector(img2);
    expect(v1).not.toEqual(v2);
  });

  it('produces deterministic output for same input', () => {
    const img = makeImageData(200, 200, 150);
    const v1 = generateVector(img);
    const v2 = generateVector(img);
    expect(v1).toEqual(v2);
  });
});
