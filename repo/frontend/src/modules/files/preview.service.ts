import { FilePreviewType } from '$lib/types/enums';

const MIME_MAP: Record<string, FilePreviewType> = {
  'image/png': FilePreviewType.Image,
  'image/jpeg': FilePreviewType.Image,
  'image/gif': FilePreviewType.Image,
  'image/webp': FilePreviewType.Image,
  'image/svg+xml': FilePreviewType.Image,
  'application/pdf': FilePreviewType.Pdf,
  'text/plain': FilePreviewType.Text,
  'text/html': FilePreviewType.Text,
  'text/css': FilePreviewType.Text,
  'text/csv': FilePreviewType.Text,
  'application/json': FilePreviewType.Text,
  'application/xml': FilePreviewType.Text,
  'audio/mpeg': FilePreviewType.Audio,
  'audio/wav': FilePreviewType.Audio,
  'audio/ogg': FilePreviewType.Audio,
  'audio/webm': FilePreviewType.Audio,
  'video/mp4': FilePreviewType.Video,
  'video/webm': FilePreviewType.Video,
  'video/ogg': FilePreviewType.Video,
};

export function getPreviewType(mimeType: string): FilePreviewType {
  if (MIME_MAP[mimeType]) return MIME_MAP[mimeType];
  if (mimeType.startsWith('image/')) return FilePreviewType.Image;
  if (mimeType.startsWith('text/')) return FilePreviewType.Text;
  if (mimeType.startsWith('audio/')) return FilePreviewType.Audio;
  if (mimeType.startsWith('video/')) return FilePreviewType.Video;
  return FilePreviewType.Unsupported;
}

export function canPreview(mimeType: string): boolean {
  return getPreviewType(mimeType) !== FilePreviewType.Unsupported;
}

export function createPreviewUrl(fileData: ArrayBuffer, mimeType: string): string {
  const blob = new Blob([fileData], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
