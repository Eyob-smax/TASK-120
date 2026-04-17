import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import { setupRealAuth, teardownRealAuth } from '../_helpers/real-auth';
import {
  reportDiscrepancy,
  reviewDiscrepancy,
  verifyDiscrepancy,
  resolveDiscrepancy,
  addAttachment,
  getDiscrepanciesByTask,
} from '../../src/modules/orders/discrepancy.service';
import { ChunkRepository } from '../../src/lib/db';
import type { DiscrepancyAttachment } from '../../src/lib/types/orders';

describe('Discrepancy Attachments', () => {
  beforeEach(async () => { await initDatabase(); await setupRealAuth(); });
  afterEach(async () => { teardownRealAuth(); await resetDb(); });

  it('reportDiscrepancy stores attachments', async () => {
    const att: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: '', fileId: crypto.randomUUID(),
      type: 'image/png', name: 'photo.png', addedAt: new Date().toISOString(),
    };
    const d = await reportDiscrepancy('task-1', 'user-1', 'Missing item', [att]);
    expect(d.attachments).toHaveLength(1);
    expect(d.attachments[0].name).toBe('photo.png');
    expect(d.attachments[0].type).toBe('image/png');
  });

  it('verifyDiscrepancy merges new attachments with existing', async () => {
    const att1: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: '', fileId: crypto.randomUUID(),
      type: 'image/jpeg', name: 'report.jpg', addedAt: new Date().toISOString(),
    };
    const d = await reportDiscrepancy('task-2', 'user-1', 'Damaged box', [att1]);
    await reviewDiscrepancy(d.id);

    const att2: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: d.id, fileId: crypto.randomUUID(),
      type: 'application/pdf', name: 'verification.pdf', addedAt: new Date().toISOString(),
    };
    const verified = await verifyDiscrepancy(d.id, 'verifier-1', 'Confirmed damage', [att2]);
    expect(verified.attachments).toHaveLength(2);
    expect(verified.attachments[0].name).toBe('report.jpg');
    expect(verified.attachments[1].name).toBe('verification.pdf');
  });

  it('addAttachment appends to existing discrepancy', async () => {
    const d = await reportDiscrepancy('task-3', 'user-1', 'Count mismatch');
    expect(d.attachments).toHaveLength(0);

    const att: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: d.id, fileId: crypto.randomUUID(),
      type: 'text/plain', name: 'notes.txt', addedAt: new Date().toISOString(),
    };
    const updated = await addAttachment(d.id, att);
    expect(updated.attachments).toHaveLength(1);
    expect(updated.attachments[0].name).toBe('notes.txt');
  });

  it('addAttachment rejects on resolved discrepancy', async () => {
    const d = await reportDiscrepancy('task-4', 'user-1', 'Wrong SKU');
    const d2 = await reviewDiscrepancy(d.id);
    const d3 = await verifyDiscrepancy(d2.id, 'verifier', 'Confirmed');
    await resolveDiscrepancy(d3.id);

    const att: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: d.id, fileId: crypto.randomUUID(),
      type: 'image/png', name: 'late.png', addedAt: new Date().toISOString(),
    };
    await expect(addAttachment(d.id, att)).rejects.toThrow('Cannot modify resolved');
  });

  it('attachments persist through getDiscrepanciesByTask', async () => {
    const att: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: '', fileId: crypto.randomUUID(),
      type: 'image/png', name: 'evidence.png', addedAt: new Date().toISOString(),
    };
    await reportDiscrepancy('task-5', 'user-1', 'Short shipment', [att]);

    const results = await getDiscrepanciesByTask('task-5');
    expect(results).toHaveLength(1);
    expect(results[0].attachments).toHaveLength(1);
    expect(results[0].attachments[0].name).toBe('evidence.png');
  });
});

describe('Discrepancy Attachment Payload Persistence', () => {
  const chunkRepo = new ChunkRepository();

  beforeEach(async () => { await initDatabase(); await setupRealAuth(); });
  afterEach(async () => { teardownRealAuth(); await resetDb(); });

  it('attachment payload is stored in IndexedDB chunks and retrievable', async () => {
    const fileId = crypto.randomUUID();
    const payload = new TextEncoder().encode('photo binary data').buffer;
    const now = new Date().toISOString();

    // Store payload as a chunk (same pattern as DiscrepancyDrawer.filesToAttachments)
    await chunkRepo.add({
      id: crypto.randomUUID(),
      fileId,
      chunkIndex: 0,
      data: payload,
      size: payload.byteLength,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    // Report discrepancy with the attachment metadata linked to stored payload
    const att: DiscrepancyAttachment = {
      id: crypto.randomUUID(), discrepancyId: '', fileId,
      type: 'image/png', name: 'evidence.png', addedAt: now,
    };
    const d = await reportDiscrepancy('task-payload', 'user-1', 'Missing item', [att]);

    // Retrieve the attachment's payload from chunks
    const chunks = await chunkRepo.getByFile(d.attachments[0].fileId);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].size).toBe(payload.byteLength);

    // Verify the data content matches
    const retrieved = new Uint8Array(chunks[0].data);
    const original = new Uint8Array(payload);
    expect(retrieved).toEqual(original);
  });

  it('multiple attachments each store separate payloads', async () => {
    const fileId1 = crypto.randomUUID();
    const fileId2 = crypto.randomUUID();
    const now = new Date().toISOString();
    const data1 = new TextEncoder().encode('file one').buffer;
    const data2 = new TextEncoder().encode('file two').buffer;

    await chunkRepo.add({ id: crypto.randomUUID(), fileId: fileId1, chunkIndex: 0, data: data1, size: data1.byteLength, createdAt: now, updatedAt: now, version: 1 });
    await chunkRepo.add({ id: crypto.randomUUID(), fileId: fileId2, chunkIndex: 0, data: data2, size: data2.byteLength, createdAt: now, updatedAt: now, version: 1 });

    const atts: DiscrepancyAttachment[] = [
      { id: crypto.randomUUID(), discrepancyId: '', fileId: fileId1, type: 'text/plain', name: 'a.txt', addedAt: now },
      { id: crypto.randomUUID(), discrepancyId: '', fileId: fileId2, type: 'text/plain', name: 'b.txt', addedAt: now },
    ];
    const d = await reportDiscrepancy('task-multi', 'user-1', 'Two files', atts);
    expect(d.attachments).toHaveLength(2);

    const chunks1 = await chunkRepo.getByFile(fileId1);
    const chunks2 = await chunkRepo.getByFile(fileId2);
    expect(chunks1).toHaveLength(1);
    expect(chunks2).toHaveLength(1);
    expect(new TextDecoder().decode(chunks1[0].data)).toBe('file one');
    expect(new TextDecoder().decode(chunks2[0].data)).toBe('file two');
  });
});
