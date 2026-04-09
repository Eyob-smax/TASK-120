import { describe, it, expect } from 'vitest';
import { LivenessFlow } from '../../src/modules/identity/liveness.service';
import { LivenessResult } from '../../src/lib/types/enums';
import { LIVENESS_FRAME_COUNT } from '../../src/lib/constants';

describe('LivenessFlow', () => {
  it('starts in idle state', () => {
    const flow = new LivenessFlow();
    expect(flow.getState()).toBe('idle');
    expect(flow.getFrameCount()).toBe(0);
  });

  it('expects LIVENESS_FRAME_COUNT frames', () => {
    expect(LIVENESS_FRAME_COUNT).toBe(5);
  });

  it('has valid LivenessResult enum values', () => {
    expect(LivenessResult.Pass).toBe('pass');
    expect(LivenessResult.FailNoBlink).toBe('fail_no_blink');
    expect(LivenessResult.FailNoTurn).toBe('fail_no_turn');
    expect(LivenessResult.FailTimeout).toBe('fail_timeout');
  });

  it('initial result is FailTimeout', () => {
    const flow = new LivenessFlow();
    expect(flow.getResult()).toBe(LivenessResult.FailTimeout);
  });
});
