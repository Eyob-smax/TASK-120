import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';

export interface OptimisticUpdate<T> {
  previous: T;
  pending: T;
  rollback: () => void;
}

export async function createOptimisticUpdate<T>(
  store: Writable<T>,
  newValue: T,
  persistFn: () => Promise<void>,
): Promise<OptimisticUpdate<T>> {
  const previous = get(store);
  store.set(newValue);

  try {
    await persistFn();
    return {
      previous,
      pending: newValue,
      rollback: () => store.set(previous),
    };
  } catch (error) {
    store.set(previous);
    throw error;
  }
}
