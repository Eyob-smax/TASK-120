import type { SearchHistoryEntry } from '$lib/types/preferences';
import { SEARCH_HISTORY_CAP } from '$lib/constants';
import { PreferenceStorage } from './storage';

export class SearchHistory {
  private storage: PreferenceStorage;
  private readonly storageKey = 'search:history';
  private readonly cap: number;

  constructor(storage: PreferenceStorage, cap: number = SEARCH_HISTORY_CAP) {
    this.storage = storage;
    this.cap = cap;
  }

  getEntries(): SearchHistoryEntry[] {
    return this.storage.get<SearchHistoryEntry[]>(this.storageKey) ?? [];
  }

  addEntry(query: string): void {
    if (!query.trim()) return;

    let entries = this.getEntries();

    // Remove duplicate if already exists
    entries = entries.filter(e => e.query !== query);

    // Prepend new entry
    entries.unshift({
      query,
      timestamp: new Date().toISOString(),
    });

    // Enforce cap
    if (entries.length > this.cap) {
      entries = entries.slice(0, this.cap);
    }

    this.storage.set(this.storageKey, entries);
  }

  clear(): void {
    this.storage.remove(this.storageKey);
  }
}
