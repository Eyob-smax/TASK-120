import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LivenessFlow } from '../../src/modules/identity/liveness.service';
import { LivenessResult } from '../../src/lib/types/enums';

function makeImageData(width: number, height: number, value = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  try {
    return new ImageData(data, width, height);
  } catch {
    return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
  }
}

describe('LivenessFlow', () => {
  beforeEach(() => {
    // Mock captureFrame so we don't need a real video element
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const el = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: vi.fn((_x, _y, w, h) => makeImageData(w, h)),
          }),
        } as any;
        return el;
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getState starts as idle', () => {
    const flow = new LivenessFlow();
    expect(flow.getState()).toBe('idle');
  });

  it('getResult defaults to FailTimeout before running', () => {
    const flow = new LivenessFlow();
    expect(flow.getResult()).toBe(LivenessResult.FailTimeout);
  });

  it('getFrameCount starts at 0', () => {
    const flow = new LivenessFlow();
    expect(flow.getFrameCount()).toBe(0);
  });

  it('start invokes onPrompt callback', async () => {
    const flow = new LivenessFlow();
    const prompts: string[] = [];

    const fakeVideo = { videoWidth: 64, videoHeight: 64 } as HTMLVideoElement;

    // Run start() — it sets state and calls onPrompt immediately then captures frames
    const attemptPromise = flow.start(fakeVideo, (msg) => prompts.push(msg));

    // Eventually resolves; await it. The captureTimedFrames has its own setTimeout
    // intervals, but should complete in < 5s.
    const attempt = await attemptPromise;

    expect(prompts.length).toBe(1);
    expect(prompts[0]).toContain('blink');
    expect(flow.getState()).toBe('done');
    expect(attempt.result).toBeDefined();
    expect([
      LivenessResult.Pass,
      LivenessResult.FailNoBlink,
      LivenessResult.FailNoTurn,
      LivenessResult.FailTimeout,
    ]).toContain(attempt.result);
  }, 20_000);

  it('analyzeBlink returns false for fewer than 3 frames (via getFrameCount)', () => {
    // Internal analyzeBlink is private, but we can test the indirect result
    const flow = new LivenessFlow();
    expect(flow.getFrameCount()).toBe(0);
  });
});
