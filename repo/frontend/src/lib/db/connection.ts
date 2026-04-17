import { openDB, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION, STORE_DEFINITIONS, STORE_NAMES } from "./schema";

let db: IDBPDatabase | null = null;

function resolveDbName(): string {
  const maybeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const workerId =
    maybeProcess?.env?.VITEST_POOL_ID ?? maybeProcess?.env?.VITEST_WORKER_ID;

  return workerId ? `${DB_NAME}-${workerId}` : DB_NAME;
}

export async function initDatabase(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(resolveDbName(), DB_VERSION, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      // Create stores that don't exist yet (fresh installs or new stores)
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

      // v2 → v3: add versionId index to existing CHUNKS store
      if (
        oldVersion < 3 &&
        database.objectStoreNames.contains(STORE_NAMES.CHUNKS)
      ) {
        const chunksStore = transaction.objectStore(STORE_NAMES.CHUNKS);
        if (!chunksStore.indexNames.contains("versionId")) {
          chunksStore.createIndex("versionId", "versionId");
        }
      }
    },
  });

  return db;
}

export function getDb(): IDBPDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
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
    const req = indexedDB.deleteDatabase(resolveDbName());
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
