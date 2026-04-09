import type { ValidationResult, ValidationError } from '$lib/types/common';
import type { Order, OrderLine, WaveConfig, Reservation } from '$lib/types/orders';
import { ReservationStatus } from '$lib/types/enums';
import { RESERVATION_TIMEOUT_MS, WAVE_DEFAULT_SIZE } from '$lib/constants';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function validateOrder(order: Partial<Order>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!order.lines || order.lines.length === 0) {
    errors.push(err('lines', 'Order must have at least one line', 'empty_lines'));
  }

  if (order.lines) {
    for (let i = 0; i < order.lines.length; i++) {
      const lineResult = validateOrderLine(order.lines[i]);
      if (!lineResult.valid) {
        for (const e of lineResult.errors) {
          errors.push(err(`lines[${i}].${e.field}`, e.message, e.code));
        }
      }
    }
  }

  return makeResult(errors);
}

export function validateOrderLine(line: Partial<OrderLine>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!line.skuId) errors.push(err('skuId', 'SKU ID is required', 'required'));
  if (line.quantity === undefined || line.quantity <= 0) {
    errors.push(err('quantity', 'Quantity must be greater than zero', 'invalid_quantity'));
  }

  return makeResult(errors);
}

export function validateWaveConfig(config: Partial<WaveConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  const maxLines = config.maxLinesPerWave ?? WAVE_DEFAULT_SIZE;
  if (maxLines <= 0) {
    errors.push(err('maxLinesPerWave', 'Max lines per wave must be greater than zero', 'invalid_size'));
  }

  return makeResult(errors);
}

export function validateReservation(reservation: Partial<Reservation>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!reservation.orderId) errors.push(err('orderId', 'Order ID is required', 'required'));
  if (!reservation.skuId) errors.push(err('skuId', 'SKU ID is required', 'required'));
  if (!reservation.binId) errors.push(err('binId', 'Bin ID is required', 'required'));
  if (reservation.quantity === undefined || reservation.quantity <= 0) {
    errors.push(err('quantity', 'Quantity must be greater than zero', 'invalid_quantity'));
  }

  return makeResult(errors);
}

export function isReservationExpired(
  lastActivityAt: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() - new Date(lastActivityAt).getTime() > RESERVATION_TIMEOUT_MS;
}
