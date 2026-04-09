import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { Repository } from '../../src/lib/db/repository';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import type { BaseEntity } from '../../src/lib/types/common';

interface TestRecord extends BaseEntity {
  name: string;
}

describe('Repository', () => {
  let repo: Repository<TestRecord>;

  beforeEach(async () => {
    await initDatabase();
    repo = new Repository<TestRecord>('users');
  });

  afterEach(async () => {
    await resetDb();
  });

  function makeRecord(overrides: Partial<TestRecord> = {}): TestRecord {
    return {
      id: overrides.id ?? `test-${Date.now()}-${Math.random()}`,
      name: overrides.name ?? 'Test Record',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: overrides.version ?? 0,
      ...overrides,
    };
  }

  it('getById returns undefined for missing ID', async () => {
    const result = await repo.getById('nonexistent');
    expect(result).toBeUndefined();
  });

  it('put stores and retrieves a record', async () => {
    const record = makeRecord({ id: 'rec-1', name: 'Alice' });
    await repo.put(record);
    const retrieved = await repo.getById('rec-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Alice');
  });

  it('put auto-increments version', async () => {
    const record = makeRecord({ id: 'rec-2', version: 0 });
    const updated = await repo.put(record);
    expect(updated.version).toBe(1);

    const updated2 = await repo.put(updated);
    expect(updated2.version).toBe(2);
  });

  it('getAll returns all stored records', async () => {
    await repo.put(makeRecord({ id: 'r1' }));
    await repo.put(makeRecord({ id: 'r2' }));
    await repo.put(makeRecord({ id: 'r3' }));
    const all = await repo.getAll();
    expect(all.length).toBeGreaterThanOrEqual(3);
  });

  it('delete removes a record', async () => {
    const record = makeRecord({ id: 'del-1' });
    await repo.put(record);
    expect(await repo.getById('del-1')).toBeDefined();

    await repo.delete('del-1');
    expect(await repo.getById('del-1')).toBeUndefined();
  });

  it('count returns correct count', async () => {
    const initial = await repo.count();
    await repo.put(makeRecord({ id: 'cnt-1' }));
    await repo.put(makeRecord({ id: 'cnt-2' }));
    const after = await repo.count();
    expect(after).toBe(initial + 2);
  });

  it('clear removes all records', async () => {
    await repo.put(makeRecord({ id: 'clr-1' }));
    await repo.put(makeRecord({ id: 'clr-2' }));
    await repo.clear();
    expect(await repo.count()).toBe(0);
  });
});
