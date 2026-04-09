import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnLayoutManager } from '../../src/modules/preferences/column-layout';
import { FilterStateManager } from '../../src/modules/preferences/filter-state';
import { PreferenceStorage } from '../../src/modules/preferences/storage';

// Mock localStorage for tests
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
};

// Override global localStorage
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

describe('ColumnLayoutManager', () => {
  let manager: ColumnLayoutManager;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    manager = new ColumnLayoutManager(new PreferenceStorage());
  });

  it('returns null for unknown table', () => {
    expect(manager.getLayout('unknown')).toBeNull();
  });

  it('saves and retrieves a layout', () => {
    const layout = {
      tableId: 'inventory',
      columns: [
        { key: 'sku', visible: true, order: 1 },
        { key: 'qty', visible: true, order: 2 },
      ],
    };
    manager.saveLayout('inventory', layout);
    const retrieved = manager.getLayout('inventory');
    expect(retrieved).toEqual(layout);
  });

  it('resets a layout', () => {
    manager.saveLayout('inventory', {
      tableId: 'inventory',
      columns: [{ key: 'sku', visible: true, order: 1 }],
    });
    manager.resetLayout('inventory');
    expect(manager.getLayout('inventory')).toBeNull();
  });
});

describe('FilterStateManager', () => {
  let manager: FilterStateManager;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    manager = new FilterStateManager(new PreferenceStorage());
  });

  it('returns null for unknown screen', () => {
    expect(manager.getFilters('unknown')).toBeNull();
  });

  it('saves and retrieves filters', () => {
    manager.saveFilters('inventory', { status: 'active', warehouse: 'wh-1' });
    const retrieved = manager.getFilters('inventory');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.filters).toEqual({ status: 'active', warehouse: 'wh-1' });
    expect(retrieved!.screenId).toBe('inventory');
  });

  it('clears filters', () => {
    manager.saveFilters('inventory', { status: 'active' });
    manager.clearFilters('inventory');
    expect(manager.getFilters('inventory')).toBeNull();
  });

  it('records savedAt timestamp', () => {
    manager.saveFilters('orders', { type: 'outbound' });
    const retrieved = manager.getFilters('orders');
    expect(retrieved!.savedAt).toBeTruthy();
    expect(new Date(retrieved!.savedAt).getTime()).toBeGreaterThan(0);
  });
});
