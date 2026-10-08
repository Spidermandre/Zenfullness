import { useEffect, useRef, useState } from 'react';
import {
  MIN_LOGGED_SECONDS,
  newEntryId,
  practiceLog,
  type LogEntry,
  type PracticeKind,
} from '../storage/log';

/**
 * Bridge between practices and the log: records a finished practice once, notifies
 * the history screen, and saves the optional note from the end screen.
 */
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version += 1;
  for (const listener of listeners) listener();
};

export interface FinishedPractice {
  kind: PracticeKind;
  startedAt: number;
  plannedSeconds: number;
  actualSeconds: number;
  completed: boolean;
  detail: string;
}

/** Saves the practice if it lasted at least a minute. Resolves to the entry id, if saved. */
export async function recordPractice(p: FinishedPractice): Promise<string | undefined> {
  if (p.actualSeconds < MIN_LOGGED_SECONDS) return undefined;
  const now = Date.now();
  const entry: LogEntry = {
    id: newEntryId(p.startedAt),
    kind: p.kind,
    startedAt: p.startedAt,
    endedAt: now,
    plannedSeconds: Math.round(p.plannedSeconds),
    actualSeconds: Math.round(p.actualSeconds),
    completed: p.completed,
    detail: p.detail,
  };
  try {
    await practiceLog().add(entry);
    changed();
    return entry.id;
  } catch (error) {
    // Storage unavailable (e.g. private mode): the practice still happened; nothing breaks.
    console.warn('Could not save the practice', error);
    return undefined;
  }
}

export async function saveNote(id: string, note: string): Promise<void> {
  try {
    await practiceLog().setNote(id, note);
    changed();
  } catch (error) {
    console.warn('Could not save the note', error);
  }
}

/** All log entries, newest first; reloads when a practice is recorded. */
export function useLog(): { entries: LogEntry[]; loaded: boolean } {
  const [state, setState] = useState<{ entries: LogEntry[]; loaded: boolean }>({
    entries: [],
    loaded: false,
  });
  const [tick, setTick] = useState(version);
  useEffect(() => {
    const listener = () => {
      setTick(version);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    practiceLog()
      .all()
      .then((entries) => {
        if (alive) setState({ entries, loaded: true });
      })
      .catch(() => {
        if (alive) setState({ entries: [], loaded: true });
      });
    return () => {
      alive = false;
    };
  }, [tick]);
  return state;
}

/** Records the practice once, the first time `finished` becomes true. */
export function useRecordOnFinish(
  finished: boolean,
  practice: () => FinishedPractice,
): string | undefined {
  const [id, setId] = useState<string | undefined>(undefined);
  const recorded = useRef(false);
  // Always call the latest closure: it reads the final snapshot when the practice ends.
  const latest = useRef(practice);
  useEffect(() => {
    latest.current = practice;
  });
  useEffect(() => {
    if (!finished || recorded.current) return;
    recorded.current = true;
    void recordPractice(latest.current()).then(setId);
  }, [finished]);
  return id;
}
