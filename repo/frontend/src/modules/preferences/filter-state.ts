import type { FilterState } from '$lib/types/preferences';
import { PreferenceStorage } from './storage';

export class FilterStateManager {
  private storage: PreferenceStorage;

  constructor(storage: PreferenceStorage) {
    this.storage = storage;
  }

  getFilters(screenId: string): FilterState | null {
    return this.storage.get<FilterState>(`filters:${screenId}`);
  }

  saveFilters(screenId: string, filters: Record<string, unknown>): void {
    this.storage.set(`filters:${screenId}`, {
      screenId,
      filters,
      savedAt: new Date().toISOString(),
    });
  }

  clearFilters(screenId: string): void {
    this.storage.remove(`filters:${screenId}`);
  }
}
