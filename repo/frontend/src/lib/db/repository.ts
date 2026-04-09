import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { BaseEntity } from '$lib/types/common';
import { getDb } from './connection';

export class Repository<T extends BaseEntity> {
  constructor(protected readonly storeName: string) {}

  async getById(id: string): Promise<T | undefined> {
    const db = getDb();
    return db.get(this.storeName, id) as Promise<T | undefined>;
  }

  async getAll(): Promise<T[]> {
    const db = getDb();
    return db.getAll(this.storeName) as Promise<T[]>;
  }

  async getByIndex(indexName: string, value: IDBValidKey): Promise<T[]> {
    const db = getDb();
    return db.getAllFromIndex(this.storeName, indexName, value) as Promise<T[]>;
  }

  async getOneByIndex(indexName: string, value: IDBValidKey): Promise<T | undefined> {
    const db = getDb();
    return db.getFromIndex(this.storeName, indexName, value) as Promise<T | undefined>;
  }

  async put(record: T): Promise<T> {
    const db = getDb();
    const updated = { ...record, version: (record.version || 0) + 1 };
    await db.put(this.storeName, updated);
    return updated as T;
  }

  async add(record: T): Promise<T> {
    const db = getDb();
    await db.add(this.storeName, record);
    return record;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(this.storeName, id);
  }

  async count(): Promise<number> {
    const db = getDb();
    return db.count(this.storeName);
  }

  async countByIndex(indexName: string, value: IDBValidKey): Promise<number> {
    const db = getDb();
    return db.countFromIndex(this.storeName, indexName, value);
  }

  async clear(): Promise<void> {
    const db = getDb();
    await db.clear(this.storeName);
  }
}

export async function withTransaction<R>(
  storeNames: string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBPTransaction<unknown, string[], typeof mode>) => Promise<R>,
): Promise<R> {
  const db = getDb();
  const tx = db.transaction(storeNames, mode);
  try {
    const result = await fn(tx);
    await tx.done;
    return result;
  } catch (error) {
    tx.abort();
    throw error;
  }
}
