import { describe, it, expect, beforeEach } from 'vitest';
import { PreferenceStorage } from '../../src/modules/preferences/storage';
import { SearchHistory } from '../../src/modules/preferences/search-history';
import { SEARCH_HISTORY_CAP } from '../../src/lib/constants';

const mockStorage: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
  configurable: true,
});

describe('PreferenceStorage', () => {
  let storage: PreferenceStorage;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    storage = new PreferenceStorage();
  });

  it('returns null for missing key', () => {
    expect(storage.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves JSON values', () => {
    storage.set('test', { a: 1, b: 'hello' });
    expect(storage.get('test')).toEqual({ a: 1, b: 'hello' });
  });

  it('stores arrays', () => {
    storage.set('list', [1, 2, 3]);
    expect(storage.get('list')).toEqual([1, 2, 3]);
  });

  it('removes keys', () => {
    storage.set('key', 'value');
    storage.remove('key');
    expect(storage.get('key')).toBeNull();
  });

  it('uses forgeops: prefix', () => {
    storage.set('mykey', 'val');
    expect(mockStorage['forgeops:mykey']).toBe('"val"');
  });

  it('handles corrupted JSON gracefully', () => {
    mockStorage['forgeops:bad'] = 'not-json{{{';
    expect(storage.get('bad')).toBeNull();
  });
});

describe('SearchHistory', () => {
  let storage: PreferenceStorage;
  let history: SearchHistory;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    storage = new PreferenceStorage();
    history = new SearchHistory(storage);
  });

  it('starts empty', () => {
    expect(history.getEntries()).toEqual([]);
  });

  it('adds entries at the front', () => {
    history.addEntry('first');
    history.addEntry('second');
    const entries = history.getEntries();
    expect(entries[0].query).toBe('second');
    expect(entries[1].query).toBe('first');
  });

  it('deduplicates entries', () => {
    history.addEntry('query');
    history.addEntry('other');
    history.addEntry('query');
    const entries = history.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].query).toBe('query');
  });

  it('enforces 50-entry cap', () => {
    for (let i = 0; i < 60; i++) {
      history.addEntry(`query-${i}`);
    }
    const entries = history.getEntries();
    expect(entries.length).toBeLessThanOrEqual(SEARCH_HISTORY_CAP);
    expect(entries.length).toBe(SEARCH_HISTORY_CAP);
  });

  it('ignores empty/whitespace queries', () => {
    history.addEntry('');
    history.addEntry('   ');
    expect(history.getEntries()).toHaveLength(0);
  });

  it('clears all entries', () => {
    history.addEntry('a');
    history.addEntry('b');
    history.clear();
    expect(history.getEntries()).toHaveLength(0);
  });

  it('records timestamp on each entry', () => {
    history.addEntry('test');
    const entries = history.getEntries();
    expect(entries[0].timestamp).toBeTruthy();
    expect(new Date(entries[0].timestamp).getTime()).toBeGreaterThan(0);
  });
});
