import { describe, it, expect } from 'vitest';
import {
  validateOrder,
  validateOrderLine,
  validateWaveConfig,
  validateReservation,
  isReservationExpired,
} from '../../src/lib/validators/orders.validators';
import { RESERVATION_TIMEOUT_MS, WAVE_DEFAULT_SIZE } from '../../src/lib/constants';

describe('Order Validators', () => {
  describe('validateOrder', () => {
    it('accepts an order with valid lines', () => {
      const result = validateOrder({
        lines: [{ id: '1', orderId: 'o-1', skuId: 'sku-1', quantity: 5 }],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects an order with no lines', () => {
      const result = validateOrder({ lines: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'empty_lines')).toBe(true);
    });

    it('rejects an order with undefined lines', () => {
      const result = validateOrder({});
      expect(result.valid).toBe(false);
    });

    it('propagates line validation errors', () => {
      const result = validateOrder({
        lines: [{ id: '1', orderId: 'o-1', skuId: '', quantity: 0 }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateOrderLine', () => {
    it('accepts a valid line', () => {
      const result = validateOrderLine({ skuId: 'sku-1', quantity: 10 });
      expect(result.valid).toBe(true);
    });

    it('rejects missing skuId', () => {
      const result = validateOrderLine({ quantity: 10 });
      expect(result.valid).toBe(false);
    });

    it('rejects zero quantity', () => {
      const result = validateOrderLine({ skuId: 'sku-1', quantity: 0 });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateWaveConfig', () => {
    it('accepts valid config with default size', () => {
      const result = validateWaveConfig({});
      expect(result.valid).toBe(true);
    });

    it('default wave size is 25 lines', () => {
      expect(WAVE_DEFAULT_SIZE).toBe(25);
    });

    it('rejects zero maxLinesPerWave', () => {
      const result = validateWaveConfig({ maxLinesPerWave: 0 });
      expect(result.valid).toBe(false);
    });

    it('rejects negative maxLinesPerWave', () => {
      const result = validateWaveConfig({ maxLinesPerWave: -10 });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateReservation', () => {
    it('accepts a valid reservation', () => {
      const result = validateReservation({
        orderId: 'o-1',
        skuId: 'sku-1',
        binId: 'bin-1',
        quantity: 5,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing orderId', () => {
      const result = validateReservation({
        skuId: 'sku-1',
        binId: 'bin-1',
        quantity: 5,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('isReservationExpired', () => {
    it('returns true when past 30 minutes', () => {
      const thirtyOneMinAgo = new Date(Date.now() - RESERVATION_TIMEOUT_MS - 60_000).toISOString();
      expect(isReservationExpired(thirtyOneMinAgo)).toBe(true);
    });

    it('returns false when within 30 minutes', () => {
      const twentyNineMinAgo = new Date(Date.now() - RESERVATION_TIMEOUT_MS + 60_000).toISOString();
      expect(isReservationExpired(twentyNineMinAgo)).toBe(false);
    });

    it('returns true at exactly 30 minutes + 1ms', () => {
      const now = new Date('2025-01-01T12:30:00.001Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(true);
    });

    it('returns false at exactly 30 minutes', () => {
      const now = new Date('2025-01-01T12:30:00.000Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(false);
    });

    it('accepts custom now parameter', () => {
      const now = new Date('2025-06-15T14:00:00.000Z');
      const lastActivity = '2025-06-15T13:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(true);
    });
  });
});
