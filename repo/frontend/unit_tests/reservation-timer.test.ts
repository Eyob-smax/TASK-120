import { describe, it, expect } from 'vitest';
import {
  isReservationExpired,
  getExpiredReservations,
  getExpiresAt,
} from '../src/modules/orders/reservation-timer';
import { ReservationStatus } from '../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS } from '../src/lib/constants';
import type { Reservation } from '../src/lib/types/orders';

function makeReservation(
  overrides: Partial<Reservation> & { lastActivityAt: string },
): Reservation {
  return {
    id: 'res-1',
    orderId: 'order-1',
    skuId: 'sku-1',
    binId: 'bin-1',
    quantity: 10,
    status: ReservationStatus.Active,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

describe('Reservation Timer', () => {
  describe('isReservationExpired', () => {
    it('returns true when past 30 minutes', () => {
      const now = new Date('2025-01-01T12:31:00.000Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(true);
    });

    it('returns false when within 30 minutes', () => {
      const now = new Date('2025-01-01T12:29:00.000Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(false);
    });

    it('returns false at exactly 30 minutes (boundary)', () => {
      const now = new Date('2025-01-01T12:30:00.000Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      // Exactly 30 min = 1,800,000ms. The check is > not >=, so not expired.
      expect(isReservationExpired(lastActivity, now)).toBe(false);
    });

    it('returns true at 30 minutes + 1ms', () => {
      const now = new Date('2025-01-01T12:30:00.001Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(true);
    });

    it('returns true for very old activity', () => {
      const now = new Date('2025-01-01T15:00:00.000Z');
      const lastActivity = '2025-01-01T12:00:00.000Z';
      expect(isReservationExpired(lastActivity, now)).toBe(true);
    });
  });

  describe('getExpiredReservations', () => {
    const now = new Date('2025-01-01T13:00:00.000Z');

    it('returns only active reservations past timeout', () => {
      const reservations = [
        makeReservation({ id: 'r1', lastActivityAt: '2025-01-01T12:00:00.000Z', status: ReservationStatus.Active }),
        makeReservation({ id: 'r2', lastActivityAt: '2025-01-01T12:50:00.000Z', status: ReservationStatus.Active }),
        makeReservation({ id: 'r3', lastActivityAt: '2025-01-01T12:00:00.000Z', status: ReservationStatus.Released }),
      ];

      const expired = getExpiredReservations(reservations, now);
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('r1');
    });

    it('excludes released reservations even if past timeout', () => {
      const reservations = [
        makeReservation({
          id: 'r1',
          lastActivityAt: '2025-01-01T10:00:00.000Z',
          status: ReservationStatus.Released,
        }),
      ];
      expect(getExpiredReservations(reservations, now)).toHaveLength(0);
    });

    it('excludes fulfilled reservations', () => {
      const reservations = [
        makeReservation({
          id: 'r1',
          lastActivityAt: '2025-01-01T10:00:00.000Z',
          status: ReservationStatus.Fulfilled,
        }),
      ];
      expect(getExpiredReservations(reservations, now)).toHaveLength(0);
    });

    it('returns empty for no expired active reservations', () => {
      const reservations = [
        makeReservation({ id: 'r1', lastActivityAt: '2025-01-01T12:50:00.000Z' }),
      ];
      expect(getExpiredReservations(reservations, now)).toHaveLength(0);
    });
  });

  describe('getExpiresAt', () => {
    it('returns correct future timestamp', () => {
      const lastActivity = '2025-01-01T12:00:00.000Z';
      const expiresAt = getExpiresAt(lastActivity);
      const expected = new Date(new Date(lastActivity).getTime() + RESERVATION_TIMEOUT_MS);
      expect(expiresAt.getTime()).toBe(expected.getTime());
    });

    it('expires at exactly 30 minutes after last activity', () => {
      const lastActivity = '2025-06-15T10:00:00.000Z';
      const expiresAt = getExpiresAt(lastActivity);
      expect(expiresAt.toISOString()).toBe('2025-06-15T10:30:00.000Z');
    });
  });
});
