import { describe, it, expect } from 'vitest';
import { getPreviewType, canPreview } from '../../src/modules/files/preview.service';
import { FilePreviewType } from '../../src/lib/types/enums';

describe('Preview Service', () => {
  describe('getPreviewType', () => {
    it('maps image MIME types correctly', () => {
      expect(getPreviewType('image/png')).toBe(FilePreviewType.Image);
      expect(getPreviewType('image/jpeg')).toBe(FilePreviewType.Image);
      expect(getPreviewType('image/gif')).toBe(FilePreviewType.Image);
      expect(getPreviewType('image/webp')).toBe(FilePreviewType.Image);
    });

    it('maps PDF type', () => {
      expect(getPreviewType('application/pdf')).toBe(FilePreviewType.Pdf);
    });

    it('maps text types', () => {
      expect(getPreviewType('text/plain')).toBe(FilePreviewType.Text);
      expect(getPreviewType('text/html')).toBe(FilePreviewType.Text);
      expect(getPreviewType('application/json')).toBe(FilePreviewType.Text);
    });

    it('maps audio types', () => {
      expect(getPreviewType('audio/mpeg')).toBe(FilePreviewType.Audio);
      expect(getPreviewType('audio/wav')).toBe(FilePreviewType.Audio);
    });

    it('maps video types', () => {
      expect(getPreviewType('video/mp4')).toBe(FilePreviewType.Video);
      expect(getPreviewType('video/webm')).toBe(FilePreviewType.Video);
    });

    it('returns unsupported for unknown types', () => {
      expect(getPreviewType('application/zip')).toBe(FilePreviewType.Unsupported);
      expect(getPreviewType('application/octet-stream')).toBe(FilePreviewType.Unsupported);
    });

    it('handles generic image/* fallback', () => {
      expect(getPreviewType('image/bmp')).toBe(FilePreviewType.Image);
    });

    it('handles generic text/* fallback', () => {
      expect(getPreviewType('text/markdown')).toBe(FilePreviewType.Text);
    });

    it('handles generic audio/* fallback', () => {
      expect(getPreviewType('audio/flac')).toBe(FilePreviewType.Audio);
    });

    it('handles generic video/* fallback', () => {
      expect(getPreviewType('video/avi')).toBe(FilePreviewType.Video);
    });
  });

  describe('canPreview', () => {
    it('returns true for previewable types', () => {
      expect(canPreview('image/png')).toBe(true);
      expect(canPreview('application/pdf')).toBe(true);
      expect(canPreview('text/plain')).toBe(true);
      expect(canPreview('audio/mpeg')).toBe(true);
      expect(canPreview('video/mp4')).toBe(true);
    });

    it('returns false for unsupported types', () => {
      expect(canPreview('application/zip')).toBe(false);
      expect(canPreview('application/octet-stream')).toBe(false);
    });
  });
});
