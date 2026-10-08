import { done, openDatabase, request } from './db';

/**
 * The practice log. One entry per finished practice (natural end or early end) that
 * lasted at least a minute. No biofeedback fields: that feature is not part of the app.
 */
export type PracticeKind = 'zazen' | 'breath' | 'guided';

export interface LogEntry {
  id: string;
  kind: PracticeKind;
  /** Epoch ms. */
  startedAt: number;
  endedAt: number;
  plannedSeconds: number;
  /** Time actually practised (pauses and preparation excluded). */
  actualSeconds: number;
  completed: boolean;
  /** Human-readable detail: "25 · 10 · 25", "Espirazione lunga", "Shikantaza". */
  detail: string;
  note?: string;
}

export const MIN_LOGGED_SECONDS = 60;

export function newEntryId(now: number, random: () => number = Math.random): string {
  return `${now.toString(36).padStart(9, '0')}-${Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')}`;
}

export interface PracticeLog {
  add(entry: LogEntry): Promise<void>;
  put(entries: readonly LogEntry[]): Promise<void>;
  setNote(id: string, note: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Newest first. */
  all(): Promise<LogEntry[]>;
}

export function createLog(dbPromise: Promise<IDBDatabase>): PracticeLog {
  const store = async (mode: IDBTransactionMode) => {
    const db = await dbPromise;
    const tx = db.transaction('log', mode);
    return { tx, log: tx.objectStore('log') };
  };
  return {
    async add(entry) {
      const { tx, log } = await store('readwrite');
      log.put(entry);
      await done(tx);
    },
    async put(entries) {
      const { tx, log } = await store('readwrite');
      for (const entry of entries) log.put(entry);
      await done(tx);
    },
    async setNote(id, note) {
      const { tx, log } = await store('readwrite');
      const entry = (await request(log.get(id))) as LogEntry | undefined;
      if (entry) {
        const trimmed = note.trim();
        const next: LogEntry = { ...entry };
        if (trimmed) next.note = trimmed;
        else delete next.note;
        log.put(next);
      }
      await done(tx);
    },
    async remove(id) {
      const { tx, log } = await store('readwrite');
      log.delete(id);
      await done(tx);
    },
    async all() {
      const { log } = await store('readonly');
      const entries = (await request(log.getAll())) as LogEntry[];
      return entries.sort((a, b) => b.startedAt - a.startedAt);
    },
  };
}

let shared: PracticeLog | undefined;

/** The app's log, opened lazily. Asks the browser to keep the data (no eviction). */
export function practiceLog(): PracticeLog {
  if (!shared) {
    shared = createLog(openDatabase(indexedDB));
    if ('storage' in navigator && typeof navigator.storage.persist === 'function') {
      void navigator.storage.persist().catch(() => false);
    }
  }
  return shared;
}
