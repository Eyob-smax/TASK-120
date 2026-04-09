import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORE_DEFINITIONS } from './schema';

let db: IDBPDatabase | null = null;

export async function initDatabase(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      for (const storeDef of STORE_DEFINITIONS) {
        if (!database.objectStoreNames.contains(storeDef.name)) {
          const store = database.createObjectStore(storeDef.name, {
            keyPath: storeDef.keyPath,
          });
          for (const index of storeDef.indexes) {
            store.createIndex(index.name, index.keyPath, index.options);
          }
        }
      }
    },
  });

  return db;
}

export function getDb(): IDBPDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export async function resetDb(): Promise<void> {
  closeDb();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
