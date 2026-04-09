import { MIN_CAPTURE_WIDTH, MIN_CAPTURE_HEIGHT } from '$lib/constants';
import { createLogger } from '$lib/logging';

const logger = createLogger('identity');

export async function initCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not supported in this browser');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { min: MIN_CAPTURE_WIDTH, ideal: 1920 },
      height: { min: MIN_CAPTURE_HEIGHT, ideal: 1080 },
      facingMode: 'user',
    },
    audio: false,
  });

  logger.info('Camera initialized', {
    tracks: stream.getVideoTracks().length,
  });

  return stream;
}

export function captureFrame(video: HTMLVideoElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function stopCamera(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
  logger.info('Camera stopped');
}
