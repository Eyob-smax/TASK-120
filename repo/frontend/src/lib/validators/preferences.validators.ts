import type { ValidationResult, ValidationError } from '$lib/types/common';
import type { SearchHistoryEntry, ColumnLayout } from '$lib/types/preferences';
import { SEARCH_HISTORY_CAP } from '$lib/constants';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function validateSearchHistory(entries: SearchHistoryEntry[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (entries.length > SEARCH_HISTORY_CAP) {
    errors.push(err(
      'entries',
      `Search history has ${entries.length} entries, exceeding cap of ${SEARCH_HISTORY_CAP}`,
      'exceeds_cap',
    ));
  }

  return makeResult(errors);
}

export function validateColumnLayout(layout: ColumnLayout): ValidationResult {
  const errors: ValidationError[] = [];

  if (!layout.tableId || layout.tableId.trim().length === 0) {
    errors.push(err('tableId', 'Table ID is required', 'required'));
  }
  if (!layout.columns || layout.columns.length === 0) {
    errors.push(err('columns', 'At least one column is required', 'empty_columns'));
  }

  if (layout.columns) {
    const orders = layout.columns.map(c => c.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      errors.push(err('columns', 'Column order values must be unique', 'duplicate_order'));
    }
  }

  return makeResult(errors);
}
