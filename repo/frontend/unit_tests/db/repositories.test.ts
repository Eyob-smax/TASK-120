import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, resetDb } from '../../src/lib/db/connection';
import {
  WarehouseRepository,
  BinRepository,
  SKURepository,
  StockRecordRepository,
  MovementLedgerRepository,
  SafetyStockConfigRepository,
  OrderRepository,
  ReservationRepository,
  WaveRepository,
  TaskRepository,
  DiscrepancyRepository,
  FileRepository,
  ChunkRepository,
  TransferSessionRepository,
  VersionRepository,
  RecycleBinRepository,
  FaceProfileRepository,
  CaptureSessionRepository,
  VectorRepository,
  NotificationRepository,
  QueuedAttemptRepository,
  SubscriptionRepository,
  ReadReceiptRepository,
} from '../../src/lib/db';
import {
  MovementReason,
  OrderStatus,
  ReservationStatus,
  WaveStatus,
  TaskStatus,
  DiscrepancyState,
  TransferState,
  NotificationType,
  QueuedAttemptStatus,
  NotificationChannel,
} from '../../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS, RECYCLE_BIN_RETENTION_MS } from '../../src/lib/constants';

const now = () => new Date().toISOString();

describe('Repositories — indexed queries', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    await resetDb();
  });

  describe('WarehouseRepository', () => {
    it('getSubWarehouses and getByCode work', async () => {
      const repo = new WarehouseRepository();
      await repo.add({
        id: 'wh-main', name: 'Main', code: 'MAIN',
        createdAt: now(), updatedAt: now(), version: 1,
      });
      await repo.add({
        id: 'wh-sub', name: 'Sub', code: 'SUB', parentId: 'wh-main',
        createdAt: now(), updatedAt: now(), version: 1,
      });

      const subs = await repo.getSubWarehouses('wh-main');
      expect(subs).toHaveLength(1);
      expect(subs[0].id).toBe('wh-sub');

      const byCode = await repo.getByCode('MAIN');
      expect(byCode?.id).toBe('wh-main');
    });
  });

  describe('BinRepository', () => {
    it('getByWarehouse and getByZone', async () => {
      const repo = new BinRepository();
      await repo.add({
        id: 'b1', warehouseId: 'w1', code: 'B1', zone: 'A', isActive: true,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      await repo.add({
        id: 'b2', warehouseId: 'w1', code: 'B2', zone: 'B', isActive: true,
        createdAt: now(), updatedAt: now(), version: 1,
      });

      const w1Bins = await repo.getByWarehouse('w1');
      expect(w1Bins).toHaveLength(2);

      const zoneA = await repo.getByZone('A');
      expect(zoneA).toHaveLength(1);
    });
  });

  describe('SKURepository', () => {
    it('getByCode and getByCategory', async () => {
      const repo = new SKURepository();
      await repo.add({
        id: 's1', code: 'SKU-1', name: 'Widget', category: 'hardware', unit: 'ea',
        createdAt: now(), updatedAt: now(), version: 1,
      });
      await repo.add({
        id: 's2', code: 'SKU-2', name: 'Gadget', category: 'hardware', unit: 'ea',
        createdAt: now(), updatedAt: now(), version: 1,
      });

      const byCode = await repo.getByCode('SKU-1');
      expect(byCode?.id).toBe('s1');

      const byCat = await repo.getByCategory('hardware');
      expect(byCat).toHaveLength(2);
    });
  });

  describe('StockRecordRepository', () => {
    it('getByBin, getBySku, getByWarehouseAndSku', async () => {
      const repo = new StockRecordRepository();
      await repo.add({
        id: 'sr1', binId: 'b1', skuId: 's1', warehouseId: 'w1', quantity: 10,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      await repo.add({
        id: 'sr2', binId: 'b2', skuId: 's1', warehouseId: 'w1', quantity: 5,
        createdAt: now(), updatedAt: now(), version: 1,
      });

      expect((await repo.getByBin('b1')).length).toBe(1);
      expect((await repo.getBySku('s1')).length).toBe(2);
      expect((await repo.getByWarehouse('w1')).length).toBe(2);
      expect((await repo.getByWarehouseAndSku('w1', 's1')).length).toBe(2);
    });
  });

  describe('MovementLedgerRepository', () => {
    it('getByDateRange, getByOperator, getBySku, getByOrder', async () => {
      const repo = new MovementLedgerRepository();
      const t1 = '2024-06-01T00:00:00.000Z';
      const t2 = '2024-06-15T00:00:00.000Z';
      const t3 = '2024-07-01T00:00:00.000Z';

      await repo.add({
        id: 'm1', timestamp: t1, operatorId: 'op1',
        sourceBinId: null, destinationBinId: 'b1', skuId: 's1', quantity: 5,
        reasonCode: MovementReason.Receive, orderId: 'o1',
        createdAt: t1, updatedAt: t1, version: 1,
      });
      await repo.add({
        id: 'm2', timestamp: t2, operatorId: 'op2',
        sourceBinId: 'b1', destinationBinId: null, skuId: 's2', quantity: 2,
        reasonCode: MovementReason.Ship,
        createdAt: t2, updatedAt: t2, version: 1,
      });
      await repo.add({
        id: 'm3', timestamp: t3, operatorId: 'op1',
        sourceBinId: null, destinationBinId: 'b2', skuId: 's1', quantity: 3,
        reasonCode: MovementReason.Receive, orderId: 'o1',
        createdAt: t3, updatedAt: t3, version: 1,
      });

      const inJune = await repo.getByDateRange(t1, t2);
      expect(inJune).toHaveLength(2);

      const op1 = await repo.getByOperator('op1');
      expect(op1).toHaveLength(2);

      const sku1 = await repo.getBySku('s1');
      expect(sku1).toHaveLength(2);

      const order1 = await repo.getByOrder('o1');
      expect(order1).toHaveLength(2);
    });

    it('blocks delete and clear', async () => {
      const repo = new MovementLedgerRepository();
      await expect(repo.delete('x')).rejects.toThrow(/append-only/i);
      await expect(repo.clear()).rejects.toThrow(/append-only/i);
    });
  });

  describe('SafetyStockConfigRepository', () => {
    it('getByWarehouse and getByWarehouseAndSku', async () => {
      const repo = new SafetyStockConfigRepository();
      await repo.add({
        id: 'c1', warehouseId: 'w1', skuId: 's1', threshold: 10,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByWarehouse('w1')).length).toBe(1);
      expect((await repo.getByWarehouseAndSku('w1', 's1')).length).toBe(1);
    });
  });

  describe('OrderRepository', () => {
    it('getByStatus, getByNumber, getByCreator', async () => {
      const repo = new OrderRepository();
      await repo.add({
        id: 'o1', orderNumber: 'ORD-1', status: OrderStatus.Reserved,
        lines: [], createdBy: 'u1',
        createdAt: now(), updatedAt: now(), version: 1,
      });
      await repo.add({
        id: 'o2', orderNumber: 'ORD-2', status: OrderStatus.Cancelled,
        lines: [], createdBy: 'u1',
        createdAt: now(), updatedAt: now(), version: 1,
      });

      expect((await repo.getByStatus(OrderStatus.Reserved)).length).toBe(1);
      expect((await repo.getByNumber('ORD-2'))?.id).toBe('o2');
      expect((await repo.getByCreator('u1')).length).toBe(2);
    });
  });

  describe('ReservationRepository', () => {
    it('getByOrder, getActive, getByStatus, getExpired', async () => {
      const repo = new ReservationRepository();
      const pastTime = new Date(Date.now() - RESERVATION_TIMEOUT_MS - 60_000).toISOString();
      const recent = now();

      await repo.add({
        id: 'r1', orderId: 'o1', skuId: 's1', binId: 'b1', quantity: 5,
        status: ReservationStatus.Active, lastActivityAt: pastTime,
        createdAt: pastTime, updatedAt: pastTime, version: 1,
      });
      await repo.add({
        id: 'r2', orderId: 'o1', skuId: 's1', binId: 'b1', quantity: 5,
        status: ReservationStatus.Active, lastActivityAt: recent,
        createdAt: recent, updatedAt: recent, version: 1,
      });
      await repo.add({
        id: 'r3', orderId: 'o2', skuId: 's2', binId: 'b2', quantity: 3,
        status: ReservationStatus.Released, lastActivityAt: recent,
        createdAt: recent, updatedAt: recent, version: 1,
      });

      expect((await repo.getByOrder('o1')).length).toBe(2);
      expect((await repo.getActive()).length).toBe(2);
      expect((await repo.getByStatus(ReservationStatus.Released)).length).toBe(1);

      const expired = await repo.getExpired();
      expect(expired.some(e => e.id === 'r1')).toBe(true);
    });
  });

  describe('WaveRepository', () => {
    it('getByStatus', async () => {
      const repo = new WaveRepository();
      await repo.add({
        id: 'w1', waveNumber: 'WAVE-1', status: WaveStatus.Planned,
        orderIds: [], lineCount: 0, config: { maxLinesPerWave: 25 },
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByStatus(WaveStatus.Planned)).length).toBe(1);
    });
  });

  describe('TaskRepository', () => {
    it('getByWave, getByPicker, getByStatus', async () => {
      const repo = new TaskRepository();
      await repo.add({
        id: 't1', waveId: 'w1', pickerId: 'p1', status: TaskStatus.Assigned,
        steps: [], assignedAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByWave('w1')).length).toBe(1);
      expect((await repo.getByPicker('p1')).length).toBe(1);
      expect((await repo.getByStatus(TaskStatus.Assigned)).length).toBe(1);
    });
  });

  describe('DiscrepancyRepository', () => {
    it('getByTask, getByState, getByReporter', async () => {
      const repo = new DiscrepancyRepository();
      await repo.add({
        id: 'd1', taskId: 't1', state: DiscrepancyState.Opened,
        reportedBy: 'u1', reportedAt: now(), description: 'Missing',
        attachments: [],
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByTask('t1')).length).toBe(1);
      expect((await repo.getByState(DiscrepancyState.Opened)).length).toBe(1);
      expect((await repo.getByReporter('u1')).length).toBe(1);
    });
  });

  describe('FileRepository', () => {
    it('getByHash, getByCreator', async () => {
      const repo = new FileRepository();
      await repo.add({
        id: 'f1', name: 'a.txt', mimeType: 'text/plain', size: 10,
        sha256: 'abc', currentVersionId: '', createdBy: 'u1', isDeleted: false,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByHash('abc')).length).toBe(1);
      expect((await repo.getByCreator('u1')).length).toBe(1);
    });
  });

  describe('ChunkRepository', () => {
    it('getByFile and getByVersion', async () => {
      const repo = new ChunkRepository();
      await repo.add({
        id: 'c1', fileId: 'f1', chunkIndex: 0, data: new Uint8Array(1).buffer,
        size: 1, versionId: 'v1',
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByFile('f1')).length).toBe(1);
      expect((await repo.getByVersion('v1')).length).toBe(1);
    });
  });

  describe('TransferSessionRepository', () => {
    it('getByStatus and getByFile', async () => {
      const repo = new TransferSessionRepository();
      await repo.add({
        id: 'ts1', fileId: 'f1', status: TransferState.Active,
        totalChunks: 1, completedChunks: 0, chunkSize: 100, startedAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByStatus(TransferState.Active)).length).toBe(1);
      expect((await repo.getByFile('f1')).length).toBe(1);
    });
  });

  describe('VersionRepository', () => {
    it('getByFile and getLatest', async () => {
      const repo = new VersionRepository();
      for (let i = 1; i <= 5; i++) {
        await repo.add({
          id: `v${i}`, fileId: 'f1', versionNumber: i, sha256: `h${i}`,
          size: 100, createdBy: 'u1',
          createdAt: now(), updatedAt: now(), version: 1,
        });
      }
      expect((await repo.getByFile('f1')).length).toBe(5);
      const latest2 = await repo.getLatest('f1', 2);
      expect(latest2[0].versionNumber).toBe(5);
      expect(latest2[1].versionNumber).toBe(4);
    });
  });

  describe('RecycleBinRepository', () => {
    it('getByFile and getExpired', async () => {
      const repo = new RecycleBinRepository();
      const pastDeletion = new Date(Date.now() - RECYCLE_BIN_RETENTION_MS - 60_000).toISOString();
      await repo.add({
        id: 'rb1', fileId: 'f1', originalName: 'x', deletedBy: 'u1',
        deletedAt: pastDeletion,
        expiresAt: new Date(new Date(pastDeletion).getTime() + RECYCLE_BIN_RETENTION_MS).toISOString(),
        createdAt: pastDeletion, updatedAt: pastDeletion, version: 1,
      });
      await repo.add({
        id: 'rb2', fileId: 'f2', originalName: 'y', deletedBy: 'u1',
        deletedAt: now(),
        expiresAt: new Date(Date.now() + RECYCLE_BIN_RETENTION_MS).toISOString(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByFile('f1')).length).toBe(1);
      const expired = await repo.getExpired();
      expect(expired.map(e => e.id)).toContain('rb1');
      expect(expired.map(e => e.id)).not.toContain('rb2');
    });
  });

  describe('FaceProfileRepository', () => {
    it('getByGroup, getByName, getByEnroller', async () => {
      const repo = new FaceProfileRepository();
      await repo.add({
        id: 'p1', name: 'Alice', groupId: 'g1', attributes: {},
        enrolledBy: 'u1', enrolledAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByGroup('g1')).length).toBe(1);
      expect((await repo.getByName('Alice')).length).toBe(1);
      expect((await repo.getByEnroller('u1')).length).toBe(1);
    });
  });

  describe('CaptureSessionRepository', () => {
    it('getByProfile', async () => {
      const repo = new CaptureSessionRepository();
      await repo.add({
        id: 'cs1', profileId: 'p1', status: 'capturing', startedAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByProfile('p1')).length).toBe(1);
    });
  });

  describe('VectorRepository', () => {
    it('getByProfile', async () => {
      const repo = new VectorRepository();
      await repo.add({
        id: 'vec1', profileId: 'p1', encryptedData: 'x', iv: 'y',
        modelVersion: '1.0', extractedAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByProfile('p1')).length).toBe(1);
    });
  });

  describe('NotificationRepository', () => {
    it('getByUser, getUnread, getByEventType', async () => {
      const repo = new NotificationRepository();
      await repo.add({
        id: 'n1', userId: 'u1', eventType: NotificationType.LowStock,
        title: 'x', body: 'x',
        createdAt: now(), updatedAt: now(), version: 1,
      });
      await repo.add({
        id: 'n2', userId: 'u1', eventType: NotificationType.LowStock,
        title: 'y', body: 'y', readAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });

      expect((await repo.getByUser('u1')).length).toBe(2);
      expect((await repo.getUnread('u1')).length).toBe(1);
      expect((await repo.getByEventType(NotificationType.LowStock)).length).toBe(2);
    });
  });

  describe('QueuedAttemptRepository', () => {
    it('getPending, getOverdue, getByNotification', async () => {
      const repo = new QueuedAttemptRepository();
      const pastTime = new Date(Date.now() - 60_000).toISOString();
      const futureTime = new Date(Date.now() + 60_000).toISOString();

      await repo.add({
        id: 'a1', notificationId: 'n1', channel: NotificationChannel.Inbox,
        templateId: 't1', attemptNumber: 1, scheduledAt: pastTime,
        status: QueuedAttemptStatus.Pending,
        createdAt: pastTime, updatedAt: pastTime, version: 1,
      });
      await repo.add({
        id: 'a2', notificationId: 'n1', channel: NotificationChannel.Email,
        templateId: 't1', attemptNumber: 1, scheduledAt: futureTime,
        status: QueuedAttemptStatus.Pending,
        createdAt: futureTime, updatedAt: futureTime, version: 1,
      });

      expect((await repo.getPending()).length).toBe(2);
      const overdue = await repo.getOverdue();
      expect(overdue.some(o => o.id === 'a1')).toBe(true);
      expect(overdue.some(o => o.id === 'a2')).toBe(false);
      expect((await repo.getByNotification('n1')).length).toBe(2);
    });
  });

  describe('SubscriptionRepository', () => {
    it('getByUser and getByEventType', async () => {
      const repo = new SubscriptionRepository();
      await repo.add({
        id: 's1', userId: 'u1', eventType: NotificationType.LowStock,
        channels: [NotificationChannel.Inbox], enabled: true,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByUser('u1')).length).toBe(1);
      expect((await repo.getByEventType(NotificationType.LowStock)).length).toBe(1);
    });
  });

  describe('ReadReceiptRepository', () => {
    it('getByNotification and getByUser', async () => {
      const repo = new ReadReceiptRepository();
      await repo.add({
        id: 'rr1', notificationId: 'n1', userId: 'u1', readAt: now(),
        createdAt: now(), updatedAt: now(), version: 1,
      });
      expect((await repo.getByNotification('n1')).length).toBe(1);
      expect((await repo.getByUser('u1')).length).toBe(1);
    });
  });
});
