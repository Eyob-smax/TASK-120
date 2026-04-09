import type { Reservation } from '$lib/types/orders';
import { ReservationStatus } from '$lib/types/enums';
import { RESERVATION_TIMEOUT_MS } from '$lib/constants';

export function isReservationExpired(
  lastActivityAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() - new Date(lastActivityAt).getTime() > RESERVATION_TIMEOUT_MS;
}

export function getExpiredReservations(
  reservations: Reservation[],
  now: Date = new Date(),
): Reservation[] {
  return reservations.filter(
    r => r.status === ReservationStatus.Active && isReservationExpired(r.lastActivityAt, now),
  );
}

export function getExpiresAt(lastActivityAt: string): Date {
  return new Date(new Date(lastActivityAt).getTime() + RESERVATION_TIMEOUT_MS);
}
