import type { LogEntry } from '../storage/log';

/**
 * Sober history figures: totals and which days had practice. No streaks, no ranking.
 * Days are local calendar days.
 */
export interface MonthSummary {
  sessions: number;
  seconds: number;
  /** Day-of-month numbers with at least one practice. */
  days: Set<number>;
}

export function monthSummary(
  entries: readonly LogEntry[],
  year: number,
  month: number,
): MonthSummary {
  const days = new Set<number>();
  let sessions = 0;
  let seconds = 0;
  for (const e of entries) {
    const d = new Date(e.startedAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    sessions += 1;
    seconds += e.actualSeconds;
    days.add(d.getDate());
  }
  return { sessions, seconds, days };
}

export interface CalendarCell {
  day: number | undefined;
}

/** Month grid starting on Monday: leading empty cells, then 1..n. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1).getDay(); // 0 = Sunday
  const offset = (first + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: offset }, () => ({ day: undefined })),
    ...Array.from({ length }, (_, i) => ({ day: i + 1 })),
  ];
}

/** "oggi", "ieri", or a short date like "6 ott". */
export function relativeDay(when: number, now: Date): 'today' | 'yesterday' | Date {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(now) - start(new Date(when))) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return new Date(when);
}
