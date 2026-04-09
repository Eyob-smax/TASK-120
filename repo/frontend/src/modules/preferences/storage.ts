import { LOCAL_STORAGE_PREFIX } from '$lib/constants';

export class PreferenceStorage {
  private prefix: string;

  constructor(prefix: string = LOCAL_STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.fullKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.fullKey(key), JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(this.fullKey(key));
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
}
