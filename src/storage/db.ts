/**
 * IndexedDB with a versioned schema and ordered migrations.
 *
 * Each migration upgrades the database from `version - 1` to `version`. When the app
 * opens an older database, every missing migration runs in order inside the single
 * upgrade transaction, so a failure leaves the old data untouched.
 * A tiny promise wrapper replaces a library: we only need open, get, put, delete, getAll.
 */
export interface Migration {
  version: number;
  description: string;
  upgrade(db: IDBDatabase, tx: IDBTransaction): void;
}

export const DB_NAME = 'zenfullness';

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'practice log (by id, indexed by start time) and meta key/value store',
    upgrade(db) {
      const log = db.createObjectStore('log', { keyPath: 'id' });
      log.createIndex('startedAt', 'startedAt');
      db.createObjectStore('meta');
    },
  },
];

export const SCHEMA_VERSION = MIGRATIONS.reduce((v, m) => Math.max(v, m.version), 0);

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

export function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
  });
}

export function openDatabase(
  factory: IDBFactory,
  name: string = DB_NAME,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<IDBDatabase> {
  const target = migrations.reduce((v, m) => Math.max(v, m.version), 0);
  return new Promise((resolve, reject) => {
    const req = factory.open(name, target);
    req.onupgradeneeded = (event) => {
      const tx = req.transaction;
      if (!tx) return;
      const from = event.oldVersion;
      for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
        if (m.version > from) m.upgrade(req.result, tx);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab (a newer version of the app) wants to upgrade: let it.
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('Cannot open IndexedDB'));
    };
    req.onblocked = () => {
      reject(new Error('IndexedDB upgrade blocked by another open tab'));
    };
  });
}
