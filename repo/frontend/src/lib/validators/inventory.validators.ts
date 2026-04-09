import type { ValidationResult, ValidationError } from '$lib/types/common';
import type { MovementEntry, SafetyStockConfig } from '$lib/types/inventory';
import { MovementReason } from '$lib/types/enums';
import { SAFETY_STOCK_DEFAULT } from '$lib/constants';

function makeResult(errors: ValidationError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function err(field: string, message: string, code: string): ValidationError {
  return { field, message, code };
}

export function validateStockMovement(
  entry: Partial<MovementEntry>,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!entry.skuId) {
    errors.push(err('skuId', 'SKU ID is required', 'required'));
  }
  if (!entry.operatorId) {
    errors.push(err('operatorId', 'Operator ID is required', 'required'));
  }
  if (entry.quantity === undefined || entry.quantity <= 0) {
    errors.push(err('quantity', 'Quantity must be greater than zero', 'invalid_quantity'));
  }
  if (!entry.reasonCode || !Object.values(MovementReason).includes(entry.reasonCode)) {
    errors.push(err('reasonCode', 'Valid reason code is required', 'invalid_reason'));
  }

  if (entry.reasonCode === MovementReason.Receive) {
    if (!entry.destinationBinId) {
      errors.push(err('destinationBinId', 'Destination bin is required for receive', 'required'));
    }
    if (entry.sourceBinId) {
      errors.push(err('sourceBinId', 'Source bin must be null for receive', 'invalid_source'));
    }
  }

  if (entry.reasonCode === MovementReason.Ship) {
    if (!entry.sourceBinId) {
      errors.push(err('sourceBinId', 'Source bin is required for shipment', 'required'));
    }
    if (entry.destinationBinId) {
      errors.push(err('destinationBinId', 'Destination bin must be null for shipment', 'invalid_destination'));
    }
  }

  if (entry.reasonCode === MovementReason.TransferOut && !entry.sourceBinId) {
    errors.push(err('sourceBinId', 'Source bin is required for transfer out', 'required'));
  }
  if (entry.reasonCode === MovementReason.TransferIn && !entry.destinationBinId) {
    errors.push(err('destinationBinId', 'Destination bin is required for transfer in', 'required'));
  }

  if (!entry.sourceBinId && !entry.destinationBinId) {
    errors.push(err('bins', 'At least one of source or destination bin is required', 'missing_bins'));
  }

  return makeResult(errors);
}

export function validateTransfer(
  fromBinId: string,
  toBinId: string,
  skuId: string,
  quantity: number,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!fromBinId) errors.push(err('fromBinId', 'Source bin is required', 'required'));
  if (!toBinId) errors.push(err('toBinId', 'Destination bin is required', 'required'));
  if (!skuId) errors.push(err('skuId', 'SKU ID is required', 'required'));
  if (quantity <= 0) errors.push(err('quantity', 'Quantity must be greater than zero', 'invalid_quantity'));
  if (fromBinId && toBinId && fromBinId === toBinId) {
    errors.push(err('toBinId', 'Cannot transfer to the same bin', 'same_bin'));
  }

  return makeResult(errors);
}

export function validateCycleCount(
  binId: string,
  skuId: string,
  actualQty: number,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!binId) errors.push(err('binId', 'Bin ID is required', 'required'));
  if (!skuId) errors.push(err('skuId', 'SKU ID is required', 'required'));
  if (actualQty < 0) errors.push(err('actualQty', 'Quantity cannot be negative', 'invalid_quantity'));

  return makeResult(errors);
}

export function validateSafetyStockConfig(
  config: Partial<SafetyStockConfig>,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!config.warehouseId) errors.push(err('warehouseId', 'Warehouse ID is required', 'required'));
  if (!config.skuId) errors.push(err('skuId', 'SKU ID is required', 'required'));

  const threshold = config.threshold ?? SAFETY_STOCK_DEFAULT;
  if (threshold < 0) errors.push(err('threshold', 'Threshold cannot be negative', 'invalid_threshold'));

  return makeResult(errors);
}
