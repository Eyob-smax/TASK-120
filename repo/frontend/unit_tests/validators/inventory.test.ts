import { describe, it, expect } from 'vitest';
import {
  validateStockMovement,
  validateTransfer,
  validateCycleCount,
  validateSafetyStockConfig,
} from '../../src/lib/validators/inventory.validators';
import { MovementReason } from '../../src/lib/types/enums';

describe('Inventory Validators', () => {
  describe('validateStockMovement', () => {
    it('accepts a valid receive movement', () => {
      const result = validateStockMovement({
        skuId: 'sku-1',
        operatorId: 'user-1',
        quantity: 10,
        reasonCode: MovementReason.Receive,
        sourceBinId: null,
        destinationBinId: 'bin-1',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects negative quantity', () => {
      const result = validateStockMovement({
        skuId: 'sku-1',
        operatorId: 'user-1',
        quantity: -5,
        reasonCode: MovementReason.Receive,
        destinationBinId: 'bin-1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'invalid_quantity')).toBe(true);
    });

    it('rejects zero quantity', () => {
      const result = validateStockMovement({
        skuId: 'sku-1',
        operatorId: 'user-1',
        quantity: 0,
        reasonCode: MovementReason.Receive,
        destinationBinId: 'bin-1',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects missing skuId', () => {
      const result = validateStockMovement({
        operatorId: 'user-1',
        quantity: 10,
        reasonCode: MovementReason.Receive,
        destinationBinId: 'bin-1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'skuId')).toBe(true);
    });

    it('rejects receive without destinationBinId', () => {
      const result = validateStockMovement({
        skuId: 'sku-1',
        operatorId: 'user-1',
        quantity: 10,
        reasonCode: MovementReason.Receive,
        sourceBinId: null,
        destinationBinId: undefined,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects ship without sourceBinId', () => {
      const result = validateStockMovement({
        skuId: 'sku-1',
        operatorId: 'user-1',
        quantity: 5,
        reasonCode: MovementReason.Ship,
        sourceBinId: undefined,
        destinationBinId: null,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects transfer_out without sourceBinId', () => {
      const result = validateStockMovement({
        skuId: 'sku-1',
        operatorId: 'user-1',
        quantity: 5,
        reasonCode: MovementReason.TransferOut,
        destinationBinId: 'bin-2',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTransfer', () => {
    it('accepts a valid transfer', () => {
      const result = validateTransfer('bin-1', 'bin-2', 'sku-1', 10);
      expect(result.valid).toBe(true);
    });

    it('rejects same-bin transfer', () => {
      const result = validateTransfer('bin-1', 'bin-1', 'sku-1', 10);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'same_bin')).toBe(true);
    });

    it('rejects zero quantity', () => {
      const result = validateTransfer('bin-1', 'bin-2', 'sku-1', 0);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCycleCount', () => {
    it('accepts zero actual quantity', () => {
      const result = validateCycleCount('bin-1', 'sku-1', 0);
      expect(result.valid).toBe(true);
    });

    it('rejects negative quantity', () => {
      const result = validateCycleCount('bin-1', 'sku-1', -1);
      expect(result.valid).toBe(false);
    });

    it('rejects missing binId', () => {
      const result = validateCycleCount('', 'sku-1', 10);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSafetyStockConfig', () => {
    it('accepts a valid config', () => {
      const result = validateSafetyStockConfig({
        warehouseId: 'wh-1',
        skuId: 'sku-1',
        threshold: 20,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects negative threshold', () => {
      const result = validateSafetyStockConfig({
        warehouseId: 'wh-1',
        skuId: 'sku-1',
        threshold: -5,
      });
      expect(result.valid).toBe(false);
    });

    it('accepts zero threshold', () => {
      const result = validateSafetyStockConfig({
        warehouseId: 'wh-1',
        skuId: 'sku-1',
        threshold: 0,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing warehouseId', () => {
      const result = validateSafetyStockConfig({ skuId: 'sku-1' });
      expect(result.valid).toBe(false);
    });
  });
});
