import { describe, it, expect } from 'vitest';
import {
  validateSearchHistory,
  validateColumnLayout,
} from '../../src/lib/validators/preferences.validators';

describe('Preferences Validators', () => {
  describe('validateSearchHistory', () => {
    it('accepts 50 entries (at cap)', () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        query: `search-${i}`,
        timestamp: new Date().toISOString(),
      }));
      expect(validateSearchHistory(entries).valid).toBe(true);
    });

    it('rejects 51 entries (over cap)', () => {
      const entries = Array.from({ length: 51 }, (_, i) => ({
        query: `search-${i}`,
        timestamp: new Date().toISOString(),
      }));
      const result = validateSearchHistory(entries);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'exceeds_cap')).toBe(true);
    });

    it('accepts empty list', () => {
      expect(validateSearchHistory([]).valid).toBe(true);
    });
  });

  describe('validateColumnLayout', () => {
    it('accepts a valid layout', () => {
      const result = validateColumnLayout({
        tableId: 'inventory-table',
        columns: [
          { key: 'sku', visible: true, order: 1 },
          { key: 'quantity', visible: true, order: 2 },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects empty tableId', () => {
      const result = validateColumnLayout({
        tableId: '',
        columns: [{ key: 'sku', visible: true, order: 1 }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects empty columns', () => {
      const result = validateColumnLayout({
        tableId: 'inventory-table',
        columns: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'empty_columns')).toBe(true);
    });

    it('rejects duplicate order values', () => {
      const result = validateColumnLayout({
        tableId: 'inventory-table',
        columns: [
          { key: 'sku', visible: true, order: 1 },
          { key: 'quantity', visible: true, order: 1 },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'duplicate_order')).toBe(true);
    });
  });
});
