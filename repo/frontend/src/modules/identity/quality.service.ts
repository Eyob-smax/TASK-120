import { QualityCheckResult } from '$lib/types/enums';
import type { QualityResult } from '$lib/types/identity';
import {
  MIN_CAPTURE_WIDTH,
  MIN_CAPTURE_HEIGHT,
  BRIGHTNESS_RANGE,
  OCCLUSION_THRESHOLD,
} from '$lib/constants';

export function checkResolution(width: number, height: number): QualityResult {
  const passed = width >= MIN_CAPTURE_WIDTH && height >= MIN_CAPTURE_HEIGHT;
  return {
    checkType: passed ? QualityCheckResult.Pass : QualityCheckResult.FailResolution,
    passed,
    details: passed
      ? `Resolution ${width}x${height} meets minimum`
      : `Resolution ${width}x${height} below minimum ${MIN_CAPTURE_WIDTH}x${MIN_CAPTURE_HEIGHT}`,
    measuredValue: width * height,
    threshold: MIN_CAPTURE_WIDTH * MIN_CAPTURE_HEIGHT,
  };
}

export function checkBrightness(imageData: ImageData): QualityResult {
  const pixels = imageData.data;
  let totalLuminance = 0;
  const pixelCount = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    totalLuminance += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
  }

  const meanLuminance = totalLuminance / pixelCount;
  const passed = meanLuminance >= BRIGHTNESS_RANGE.min && meanLuminance <= BRIGHTNESS_RANGE.max;

  let checkType = QualityCheckResult.Pass;
  let details = `Mean brightness ${meanLuminance.toFixed(1)} within range`;

  if (meanLuminance < BRIGHTNESS_RANGE.min) {
    checkType = QualityCheckResult.FailBrightness;
    details = `Too dark: brightness ${meanLuminance.toFixed(1)} below minimum ${BRIGHTNESS_RANGE.min}`;
  } else if (meanLuminance > BRIGHTNESS_RANGE.max) {
    checkType = QualityCheckResult.FailBrightness;
    details = `Too bright: brightness ${meanLuminance.toFixed(1)} above maximum ${BRIGHTNESS_RANGE.max}`;
  }

  return { checkType, passed, details, measuredValue: meanLuminance, threshold: BRIGHTNESS_RANGE.max };
}

export function checkOcclusion(imageData: ImageData): QualityResult {
  // Edge-density heuristic: compute Sobel-like edge magnitude
  // Low edge density in face region suggests heavy occlusion
  const { width, height, data } = imageData;
  let edgeSum = 0;
  const pixelCount = (width - 2) * (height - 2);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const left = data[((y) * width + (x - 1)) * 4];
      const right = data[((y) * width + (x + 1)) * 4];
      const top = data[((y - 1) * width + x) * 4];
      const bottom = data[((y + 1) * width + x) * 4];

      const gx = Math.abs(right - left);
      const gy = Math.abs(bottom - top);
      edgeSum += (gx + gy) / 510; // Normalize to 0-1
    }
  }

  // Occlusion score: inverse of edge density (more edges = less occlusion)
  const edgeDensity = pixelCount > 0 ? edgeSum / pixelCount : 0;
  const occlusionScore = 1 - Math.min(edgeDensity * 5, 1); // Scale and invert

  const passed = occlusionScore < OCCLUSION_THRESHOLD;

  return {
    checkType: passed ? QualityCheckResult.Pass : QualityCheckResult.FailOcclusion,
    passed,
    details: passed
      ? `Occlusion score ${occlusionScore.toFixed(2)} below threshold`
      : `Heavy occlusion detected: score ${occlusionScore.toFixed(2)} >= ${OCCLUSION_THRESHOLD}`,
    measuredValue: occlusionScore,
    threshold: OCCLUSION_THRESHOLD,
  };
}

export function runAllQualityChecks(
  imageData: ImageData,
  width: number,
  height: number,
): QualityResult[] {
  return [
    checkResolution(width, height),
    checkBrightness(imageData),
    checkOcclusion(imageData),
  ];
}
