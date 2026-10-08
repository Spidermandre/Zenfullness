import type { Page } from '@playwright/test';

export interface SeedEntry {
  day: number;
  hour?: number;
  kind?: 'zazen' | 'breath' | 'guided';
  minutes: number;
  completed?: boolean;
  detail?: string;
}

/** Writes practice-log entries (October 2026) straight into IndexedDB, then reloads. */
export async function seedLog(page: Page, entries: SeedEntry[]): Promise<void> {
  await page.evaluate(async (rows) => {
    const req = indexedDB.open('zenfullness', 1);
    req.onupgradeneeded = () => {
      const log = req.result.createObjectStore('log', { keyPath: 'id' });
      log.createIndex('startedAt', 'startedAt');
      req.result.createObjectStore('meta');
    };
    const db = await new Promise<IDBDatabase>((resolve) => {
      req.onsuccess = () => {
        resolve(req.result);
      };
    });
    const tx = db.transaction('log', 'readwrite');
    rows.forEach((r, i) => {
      const startedAt = new Date(2026, 9, r.day, r.hour ?? 7).getTime();
      tx.objectStore('log').put({
        id: `seed-${String(i)}`,
        kind: r.kind ?? 'zazen',
        startedAt,
        endedAt: startedAt + r.minutes * 60_000,
        plannedSeconds: r.minutes * 60,
        actualSeconds: r.minutes * 60,
        completed: r.completed ?? true,
        detail: r.detail ?? String(r.minutes),
      });
    });
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
    db.close();
  }, entries);
  await page.reload();
}
