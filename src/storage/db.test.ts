import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, openDatabase, request, SCHEMA_VERSION, type Migration } from './db';
import { createLog, newEntryId, type LogEntry } from './log';

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'a',
  kind: 'zazen',
  startedAt: 1000,
  endedAt: 1_501_000,
  plannedSeconds: 1500,
  actualSeconds: 1500,
  completed: true,
  detail: '25',
  ...over,
});

describe('database', () => {
  it('opens at the current schema version with the expected stores', async () => {
    const db = await openDatabase(new IDBFactory());
    expect(db.version).toBe(SCHEMA_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual(['log', 'meta']);
    db.close();
  });

  it('runs only the missing migrations, in order, keeping existing data', async () => {
    const factory = new IDBFactory();
    const v1 = await openDatabase(factory, 'test', MIGRATIONS);
    await createLog(Promise.resolve(v1)).add(entry({ detail: 'old' }));
    v1.close();

    // A hypothetical future migration: rename `detail` into `label` on every entry.
    const ran: number[] = [];
    const v2: Migration = {
      version: 2,
      description: 'test: rename detail → label',
      upgrade(_db, tx) {
        ran.push(2);
        const store = tx.objectStore('log');
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return;
          const { detail, ...rest } = c.value as LogEntry;
          c.update({ ...rest, label: detail });
          c.continue();
        };
      },
    };
    const upgraded = await openDatabase(factory, 'test', [...MIGRATIONS, v2]);
    expect(upgraded.version).toBe(2);
    expect(ran).toEqual([2]);
    const rows = await request(upgraded.transaction('log').objectStore('log').getAll());
    expect(rows).toEqual([expect.objectContaining({ id: 'a', label: 'old' })]);
    upgraded.close();
  });
});

describe('practice log', () => {
  it('stores, lists newest first, annotates and removes entries', async () => {
    const log = createLog(openDatabase(new IDBFactory()));
    await log.add(entry({ id: 'a', startedAt: 1 }));
    await log.add(entry({ id: 'b', startedAt: 2 }));
    expect((await log.all()).map((e) => e.id)).toEqual(['b', 'a']);
    await log.setNote('a', '  gambe stanche  ');
    expect((await log.all()).find((e) => e.id === 'a')?.note).toBe('gambe stanche');
    await log.setNote('a', '   ');
    expect((await log.all()).find((e) => e.id === 'a')).not.toHaveProperty('note');
    await log.remove('b');
    expect((await log.all()).map((e) => e.id)).toEqual(['a']);
  });

  it('creates unique, time-ordered ids', () => {
    const a = newEntryId(1000, () => 0.1);
    const b = newEntryId(2000, () => 0.1);
    expect(a).not.toBe(b);
    expect(a < b).toBe(true);
  });
});
