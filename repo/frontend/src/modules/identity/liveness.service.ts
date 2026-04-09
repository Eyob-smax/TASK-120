import { LivenessResult as LivenessResultEnum } from '$lib/types/enums';
import type { LivenessAttempt } from '$lib/types/identity';
import { LIVENESS_FRAME_COUNT, LIVENESS_DURATION_MS } from '$lib/constants';
import { captureFrame } from './capture.service';
import { createLogger } from '$lib/logging';

const logger = createLogger('identity');

type LivenessState = 'idle' | 'prompting' | 'capturing' | 'analyzing' | 'done';

export class LivenessFlow {
  private state: LivenessState = 'idle';
  private frames: ImageData[] = [];
  private startTime = 0;
  private result: LivenessResultEnum = LivenessResultEnum.FailTimeout;

  getState(): LivenessState {
    return this.state;
  }

  async start(
    video: HTMLVideoElement,
    onPrompt: (message: string) => void,
  ): Promise<LivenessAttempt> {
    this.state = 'prompting';
    this.frames = [];
    this.startTime = Date.now();

    onPrompt('Please blink and slowly turn your head left and right');

    // Short delay for user to read prompt
    await new Promise(r => setTimeout(r, 1000));

    this.state = 'capturing';
    await this.captureTimedFrames(video);

    this.state = 'analyzing';
    const hasBlink = this.analyzeBlink();
    const hasTurn = this.analyzeTurn();

    if (hasBlink && hasTurn) {
      this.result = LivenessResultEnum.Pass;
    } else if (!hasBlink) {
      this.result = LivenessResultEnum.FailNoBlink;
    } else {
      this.result = LivenessResultEnum.FailNoTurn;
    }

    this.state = 'done';
    const durationMs = Date.now() - this.startTime;

    logger.info('Liveness check complete', {
      result: this.result,
      framesCaptured: this.frames.length,
      durationMs,
    });

    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      sessionId: '',
      result: this.result,
      framesCaptured: this.frames.length,
      durationMs,
      attemptedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }

  private async captureTimedFrames(video: HTMLVideoElement): Promise<void> {
    const interval = LIVENESS_DURATION_MS / LIVENESS_FRAME_COUNT;

    for (let i = 0; i < LIVENESS_FRAME_COUNT; i++) {
      if (Date.now() - this.startTime > LIVENESS_DURATION_MS + 2000) {
        break; // Timeout safety
      }
      try {
        const frame = captureFrame(video);
        this.frames.push(frame);
      } catch {
        // Skip failed frame capture
      }
      if (i < LIVENESS_FRAME_COUNT - 1) {
        await new Promise(r => setTimeout(r, interval));
      }
    }
  }

  private analyzeBlink(): boolean {
    if (this.frames.length < 3) return false;

    // Detect blink by looking for brightness variance in the upper third (eye region)
    const eyeRegionBrightness: number[] = [];

    for (const frame of this.frames) {
      const eyeTop = Math.floor(frame.height * 0.25);
      const eyeBottom = Math.floor(frame.height * 0.45);
      let sum = 0;
      let count = 0;

      for (let y = eyeTop; y < eyeBottom; y++) {
        for (let x = 0; x < frame.width; x++) {
          const idx = (y * frame.width + x) * 4;
          sum += frame.data[idx] * 0.299 + frame.data[idx + 1] * 0.587 + frame.data[idx + 2] * 0.114;
          count++;
        }
      }
      eyeRegionBrightness.push(count > 0 ? sum / count : 0);
    }

    // Blink = significant dip then recovery in eye brightness
    const max = Math.max(...eyeRegionBrightness);
    const min = Math.min(...eyeRegionBrightness);
    const variance = max > 0 ? (max - min) / max : 0;

    return variance > 0.02; // 2% variance suggests blink activity
  }

  private analyzeTurn(): boolean {
    if (this.frames.length < 3) return false;

    // Detect turn by measuring horizontal centroid shift across frames
    const centroids: number[] = [];

    for (const frame of this.frames) {
      let weightedX = 0;
      let totalWeight = 0;
      const midY = Math.floor(frame.height / 2);
      const bandHeight = Math.floor(frame.height * 0.3);

      for (let y = midY - bandHeight / 2; y < midY + bandHeight / 2; y++) {
        for (let x = 0; x < frame.width; x++) {
          const idx = (y * frame.width + x) * 4;
          const brightness = frame.data[idx] * 0.299 + frame.data[idx + 1] * 0.587 + frame.data[idx + 2] * 0.114;
          weightedX += x * brightness;
          totalWeight += brightness;
        }
      }
      centroids.push(totalWeight > 0 ? weightedX / totalWeight : frame.width / 2);
    }

    // Turn = centroid shift > 1% of frame width
    const maxShift = Math.max(...centroids) - Math.min(...centroids);
    const relativeShift = this.frames[0] ? maxShift / this.frames[0].width : 0;

    return relativeShift > 0.01;
  }

  getResult(): LivenessResultEnum {
    return this.result;
  }

  getFrameCount(): number {
    return this.frames.length;
  }
}
