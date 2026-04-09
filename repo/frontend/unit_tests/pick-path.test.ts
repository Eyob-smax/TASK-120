import { describe, it, expect } from 'vitest';
import { sortPickPath } from '../src/modules/orders/pick-path';
import type { PickPathStep, PickPathConfig } from '../src/lib/types/orders';

function makeStep(overrides: Partial<PickPathStep>): PickPathStep {
  return {
    binId: overrides.binId ?? 'bin-1',
    zone: overrides.zone ?? 'A',
    binCode: overrides.binCode ?? 'A-01-01',
    skuId: overrides.skuId ?? 'sku-1',
    quantity: overrides.quantity ?? 1,
    sequence: overrides.sequence ?? 0,
  };
}

const defaultConfig: PickPathConfig = {
  sortBy: 'zone_then_bin',
  zonePriority: ['A', 'B', 'C'],
};

describe('sortPickPath', () => {
  it('sorts by zone priority first', () => {
    const steps = [
      makeStep({ zone: 'C', binCode: 'C-01' }),
      makeStep({ zone: 'A', binCode: 'A-01' }),
      makeStep({ zone: 'B', binCode: 'B-01' }),
    ];
    const sorted = sortPickPath(steps, defaultConfig);
    expect(sorted[0].zone).toBe('A');
    expect(sorted[1].zone).toBe('B');
    expect(sorted[2].zone).toBe('C');
  });

  it('sorts by bin code alphabetically within same zone', () => {
    const steps = [
      makeStep({ zone: 'A', binCode: 'A-03' }),
      makeStep({ zone: 'A', binCode: 'A-01' }),
      makeStep({ zone: 'A', binCode: 'A-02' }),
    ];
    const sorted = sortPickPath(steps, defaultConfig);
    expect(sorted[0].binCode).toBe('A-01');
    expect(sorted[1].binCode).toBe('A-02');
    expect(sorted[2].binCode).toBe('A-03');
  });

  it('places unknown zones after prioritized zones', () => {
    const steps = [
      makeStep({ zone: 'X', binCode: 'X-01' }),
      makeStep({ zone: 'A', binCode: 'A-01' }),
      makeStep({ zone: 'Z', binCode: 'Z-01' }),
    ];
    const sorted = sortPickPath(steps, defaultConfig);
    expect(sorted[0].zone).toBe('A');
    // Unknown zones come after all prioritized zones
    expect(sorted[1].zone).toBe('X');
    expect(sorted[2].zone).toBe('Z');
  });

  it('returns empty array for empty input', () => {
    expect(sortPickPath([], defaultConfig)).toEqual([]);
  });

  it('returns single step with sequence 1', () => {
    const steps = [makeStep({ zone: 'A', binCode: 'A-01' })];
    const sorted = sortPickPath(steps, defaultConfig);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].sequence).toBe(1);
  });

  it('assigns sequence numbers 1..N', () => {
    const steps = [
      makeStep({ zone: 'B', binCode: 'B-02' }),
      makeStep({ zone: 'A', binCode: 'A-01' }),
      makeStep({ zone: 'C', binCode: 'C-01' }),
    ];
    const sorted = sortPickPath(steps, defaultConfig);
    expect(sorted[0].sequence).toBe(1);
    expect(sorted[1].sequence).toBe(2);
    expect(sorted[2].sequence).toBe(3);
  });

  it('handles case-insensitive bin code sorting', () => {
    const steps = [
      makeStep({ zone: 'A', binCode: 'a-02' }),
      makeStep({ zone: 'A', binCode: 'A-01' }),
    ];
    const sorted = sortPickPath(steps, defaultConfig);
    expect(sorted[0].binCode).toBe('A-01');
    expect(sorted[1].binCode).toBe('a-02');
  });

  it('does not mutate the input array', () => {
    const steps = [
      makeStep({ zone: 'B', binCode: 'B-01' }),
      makeStep({ zone: 'A', binCode: 'A-01' }),
    ];
    const original = [...steps];
    sortPickPath(steps, defaultConfig);
    expect(steps[0].zone).toBe(original[0].zone);
    expect(steps[1].zone).toBe(original[1].zone);
  });
});
