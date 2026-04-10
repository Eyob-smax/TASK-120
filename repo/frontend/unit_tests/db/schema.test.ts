import { describe, it, expect } from 'vitest';
import { DB_NAME, DB_VERSION, STORE_NAMES, STORE_DEFINITIONS } from '../../src/lib/db/schema';

describe('Database Schema', () => {
  it('database name is forgeops-offline', () => {
    expect(DB_NAME).toBe('forgeops-offline');
  });

  it('database version is 3', () => {
    expect(DB_VERSION).toBe(3);
  });

  it('STORE_NAMES has 25 entries', () => {
    expect(Object.keys(STORE_NAMES)).toHaveLength(25);
  });

  it('STORE_DEFINITIONS has 25 entries', () => {
    expect(STORE_DEFINITIONS).toHaveLength(25);
  });

  it('every store definition name matches a STORE_NAMES value', () => {
    const nameValues = new Set(Object.values(STORE_NAMES));
    for (const def of STORE_DEFINITIONS) {
      expect(nameValues.has(def.name as typeof STORE_NAMES[keyof typeof STORE_NAMES])).toBe(true);
    }
  });

  it('all stores use id as keyPath', () => {
    for (const def of STORE_DEFINITIONS) {
      expect(def.keyPath).toBe('id');
    }
  });

  it('users store has a unique username index', () => {
    const usersDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.USERS);
    expect(usersDef).toBeDefined();
    const usernameIndex = usersDef!.indexes.find(i => i.name === 'username');
    expect(usernameIndex).toBeDefined();
    expect(usernameIndex!.options?.unique).toBe(true);
  });

  it('movement_ledger has timestamp, operatorId, skuId, orderId indexes', () => {
    const ledgerDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.MOVEMENT_LEDGER);
    expect(ledgerDef).toBeDefined();
    const indexNames = ledgerDef!.indexes.map(i => i.name);
    expect(indexNames).toContain('timestamp');
    expect(indexNames).toContain('operatorId');
    expect(indexNames).toContain('skuId');
    expect(indexNames).toContain('orderId');
  });

  it('reservations has orderId, status, lastActivityAt indexes', () => {
    const resDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.RESERVATIONS);
    expect(resDef).toBeDefined();
    const indexNames = resDef!.indexes.map(i => i.name);
    expect(indexNames).toContain('orderId');
    expect(indexNames).toContain('status');
    expect(indexNames).toContain('lastActivityAt');
  });

  it('chunks store has fileId, chunkIndex, and versionId indexes', () => {
    const chunksDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.CHUNKS);
    expect(chunksDef).toBeDefined();
    const indexNames = chunksDef!.indexes.map(i => i.name);
    expect(indexNames).toContain('fileId');
    expect(indexNames).toContain('chunkIndex');
    expect(indexNames).toContain('versionId');
  });

  it('files store has sha256, name, createdBy, isDeleted indexes', () => {
    const filesDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.FILES);
    expect(filesDef).toBeDefined();
    const indexNames = filesDef!.indexes.map(i => i.name);
    expect(indexNames).toContain('sha256');
    expect(indexNames).toContain('name');
    expect(indexNames).toContain('createdBy');
    expect(indexNames).toContain('isDeleted');
  });

  it('queued_attempts has status and scheduledAt indexes', () => {
    const qaDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.QUEUED_ATTEMPTS);
    expect(qaDef).toBeDefined();
    const indexNames = qaDef!.indexes.map(i => i.name);
    expect(indexNames).toContain('status');
    expect(indexNames).toContain('scheduledAt');
  });

  it('stock_records has compound warehouseId_skuId index', () => {
    const srDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.STOCK_RECORDS);
    expect(srDef).toBeDefined();
    const compoundIndex = srDef!.indexes.find(i => i.name === 'warehouseId_skuId');
    expect(compoundIndex).toBeDefined();
    expect(compoundIndex!.keyPath).toEqual(['warehouseId', 'skuId']);
  });

  it('warehouses has unique code index', () => {
    const whDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.WAREHOUSES);
    expect(whDef).toBeDefined();
    const codeIndex = whDef!.indexes.find(i => i.name === 'code');
    expect(codeIndex!.options?.unique).toBe(true);
  });

  it('orders has unique orderNumber index', () => {
    const orderDef = STORE_DEFINITIONS.find(d => d.name === STORE_NAMES.ORDERS);
    expect(orderDef).toBeDefined();
    const numIndex = orderDef!.indexes.find(i => i.name === 'orderNumber');
    expect(numIndex!.options?.unique).toBe(true);
  });
});
