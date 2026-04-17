import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import FilePreview from '../../src/components/FilePreview.svelte';

// jsdom doesn't implement createObjectURL/revokeObjectURL — polyfill them
if (typeof URL.createObjectURL !== 'function') {
  (URL as any).createObjectURL = () => 'blob:mock';
}
if (typeof URL.revokeObjectURL !== 'function') {
  (URL as any).revokeObjectURL = () => {};
}

describe('FilePreview', () => {
  let createSpy: ReturnType<typeof vi.fn>;
  let revokeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createSpy = vi.fn(() => 'blob:mock-preview-url');
    revokeSpy = vi.fn();
    (URL as any).createObjectURL = createSpy;
    (URL as any).revokeObjectURL = revokeSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows "No file data to preview" when fileData is null', () => {
    const { container } = render(FilePreview, {
      props: { fileData: null, mimeType: '', fileName: '' },
    });
    const noData = container.querySelector('.no-data');
    expect(noData).not.toBeNull();
    expect(noData?.textContent).toBe('No file data to preview');
  });

  it('renders text content in <pre> for text/plain files', async () => {
    const text = 'Hello, this is plain text content.';
    const buffer = new TextEncoder().encode(text).buffer;
    const { container } = render(FilePreview, {
      props: { fileData: buffer, mimeType: 'text/plain', fileName: 'readme.txt' },
    });
    await tick();
    const pre = container.querySelector('.text-preview');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe(text);
  });

  it('renders <img> element for image/png files with correct alt', async () => {
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    const { container } = render(FilePreview, {
      props: { fileData: buffer, mimeType: 'image/png', fileName: 'photo.png' },
    });
    await tick();
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('photo.png');
    expect(img?.getAttribute('src')).toBe('blob:mock-preview-url');
  });

  it('renders <iframe> for application/pdf files', async () => {
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
    const { container } = render(FilePreview, {
      props: { fileData: buffer, mimeType: 'application/pdf', fileName: 'doc.pdf' },
    });
    await tick();
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('title')).toBe('doc.pdf');
    expect(iframe?.getAttribute('src')).toBe('blob:mock-preview-url');
  });

  it('renders <audio> element with controls for audio/mpeg', async () => {
    const buffer = new Uint8Array([0xFF, 0xFB]).buffer;
    const { container } = render(FilePreview, {
      props: { fileData: buffer, mimeType: 'audio/mpeg', fileName: 'song.mp3' },
    });
    await tick();
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.hasAttribute('controls')).toBe(true);
    expect(audio?.getAttribute('src')).toBe('blob:mock-preview-url');
  });

  it('renders <video> element with controls for video/mp4', async () => {
    const buffer = new Uint8Array([0x00, 0x00]).buffer;
    const { container } = render(FilePreview, {
      props: { fileData: buffer, mimeType: 'video/mp4', fileName: 'clip.mp4' },
    });
    await tick();
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.hasAttribute('controls')).toBe(true);
  });

  it('shows unsupported message for unknown mime types', async () => {
    const buffer = new Uint8Array([0x00]).buffer;
    const { container } = render(FilePreview, {
      props: { fileData: buffer, mimeType: 'application/octet-stream', fileName: 'blob.bin' },
    });
    await tick();
    const unsupported = container.querySelector('.unsupported');
    expect(unsupported).not.toBeNull();
    expect(unsupported?.querySelector('p')?.textContent).toBe('Preview not available for this file type');
    expect(unsupported?.querySelector('.mime')?.textContent).toBe('application/octet-stream');
  });
});
