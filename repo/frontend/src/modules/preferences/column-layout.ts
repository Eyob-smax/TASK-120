import type { ColumnLayout } from '$lib/types/preferences';
import { PreferenceStorage } from './storage';

export class ColumnLayoutManager {
  private storage: PreferenceStorage;

  constructor(storage: PreferenceStorage) {
    this.storage = storage;
  }

  getLayout(tableId: string): ColumnLayout | null {
    return this.storage.get<ColumnLayout>(`columns:${tableId}`);
  }

  saveLayout(tableId: string, layout: ColumnLayout): void {
    this.storage.set(`columns:${tableId}`, { ...layout, tableId });
  }

  resetLayout(tableId: string): void {
    this.storage.remove(`columns:${tableId}`);
  }
}
