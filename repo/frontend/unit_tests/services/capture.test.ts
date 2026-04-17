import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  initCamera,
  captureFrame,
  stopCamera,
} from '../../src/modules/identity/capture.service';

describe('Capture Service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initCamera', () => {
    it('throws when navigator.mediaDevices is unavailable', async () => {
      vi.stubGlobal('navigator', { mediaDevices: undefined });
      await expect(initCamera()).rejects.toThrow(/not supported/i);
    });

    it('throws when getUserMedia is missing', async () => {
      vi.stubGlobal('navigator', { mediaDevices: {} });
      await expect(initCamera()).rejects.toThrow(/not supported/i);
    });

    it('returns stream from getUserMedia when supported', async () => {
      const fakeStream = {
        getVideoTracks: () => [{ stop: vi.fn() }],
        getTracks: () => [{ stop: vi.fn() }],
      } as unknown as MediaStream;
      const getUserMedia = vi.fn(async () => fakeStream);
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

      const stream = await initCamera();
      expect(stream).toBe(fakeStream);
      expect(getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.any(Object),
          audio: false,
        }),
      );
    });
  });

  describe('captureFrame', () => {
    it('returns ImageData from a video element via canvas', () => {
      // Stub document.createElement('canvas') to return a fake with drawImage/getImageData
      const origCreate = document.createElement.bind(document);
      const fakeCanvas = origCreate('canvas') as HTMLCanvasElement;
      const fakeImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData;
      const ctx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => fakeImageData),
      } as unknown as CanvasRenderingContext2D;
      fakeCanvas.getContext = vi.fn(() => ctx) as any;

      const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return fakeCanvas;
        return origCreate(tag);
      });

      const fakeVideo = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
      const result = captureFrame(fakeVideo);
      expect(result).toBe(fakeImageData);
      expect(ctx.drawImage).toHaveBeenCalled();

      createSpy.mockRestore();
    });
  });

  describe('stopCamera', () => {
    it('stops all tracks', () => {
      const stop1 = vi.fn();
      const stop2 = vi.fn();
      const stream = {
        getTracks: () => [{ stop: stop1 }, { stop: stop2 }],
      } as unknown as MediaStream;

      stopCamera(stream);
      expect(stop1).toHaveBeenCalled();
      expect(stop2).toHaveBeenCalled();
    });

    it('handles empty track array gracefully', () => {
      const stream = { getTracks: () => [] } as unknown as MediaStream;
      expect(() => stopCamera(stream)).not.toThrow();
    });
  });
});
