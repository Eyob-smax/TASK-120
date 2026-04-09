import { describe, it, expect } from 'vitest';
import { writable, get } from 'svelte/store';
import { createOptimisticUpdate } from '../../src/lib/services/optimistic';

describe('Optimistic Update', () => {
  it('applies new value on success', async () => {
    const store = writable(10);
    const result = await createOptimisticUpdate(store, 20, async () => {});
    expect(get(store)).toBe(20);
    expect(result.previous).toBe(10);
    expect(result.pending).toBe(20);
  });

  it('rolls back on persist failure', async () => {
    const store = writable('original');
    await expect(
      createOptimisticUpdate(store, 'optimistic', async () => {
        throw new Error('persist failed');
      }),
    ).rejects.toThrow('persist failed');
    expect(get(store)).toBe('original');
  });

  it('rollback function restores previous value', async () => {
    const store = writable(100);
    const result = await createOptimisticUpdate(store, 200, async () => {});
    expect(get(store)).toBe(200);

    result.rollback();
    expect(get(store)).toBe(100);
  });

  it('works with object values', async () => {
    const store = writable({ count: 0, name: 'test' });
    const newVal = { count: 1, name: 'updated' };
    const result = await createOptimisticUpdate(store, newVal, async () => {});
    expect(get(store)).toEqual(newVal);
    expect(result.previous).toEqual({ count: 0, name: 'test' });
  });
});
