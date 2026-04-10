/**
 * Inventory Module
 *
 * Manages multi-warehouse and sub-warehouse bin inventory, stock movements,
 * inbound/outbound operations, cycle counts, stock transfers, safety stock
 * alerts (default 20 units/SKU/warehouse), and the immutable movement ledger.
 */

export {
  receiveStock,
  shipStock,
  transferStock,
  cycleCount,
  checkSafetyStock,
  getStockByBin,
  getStockByWarehouse,
  getLedger,
} from './inventory.service';

export {
  inventoryStore,
  ledgerStore,
  alertStore,
  loadInventory,
  loadLedger,
  setAlerts,
  optimisticReceive,
  optimisticShip,
  optimisticTransfer,
  optimisticCycleCount,
} from './inventory.store';
