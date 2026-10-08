import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../storage/log';
import { monthGrid, monthSummary, relativeDay } from './stats';

const at = (y: number, m: number, d: number, h = 7) => new Date(y, m, d, h).getTime();
const entry = (startedAt: number, actualSeconds = 1500): LogEntry => ({
  id: String(startedAt),
  kind: 'zazen',
  startedAt,
  endedAt: startedAt + actualSeconds * 1000,
  plannedSeconds: actualSeconds,
  actualSeconds,
  completed: true,
  detail: '',
});

describe('monthSummary', () => {
  it('counts sessions, time and practice days of one month only', () => {
    const log = [
      entry(at(2026, 9, 2)),
      entry(at(2026, 9, 2, 19), 600),
      entry(at(2026, 9, 7)),
      entry(at(2026, 8, 30)),
    ];
    const s = monthSummary(log, 2026, 9);
    expect(s.sessions).toBe(3);
    expect(s.seconds).toBe(3600);
    expect([...s.days].sort((a, b) => a - b)).toEqual([2, 7]);
  });
});

describe('monthGrid', () => {
  it('October 2026 starts on Thursday: three empty cells, then 31 days', () => {
    const grid = monthGrid(2026, 9);
    expect(grid.slice(0, 4).map((c) => c.day)).toEqual([undefined, undefined, undefined, 1]);
    expect(grid.filter((c) => c.day).length).toBe(31);
  });
  it('handles February in a leap year and months starting on Monday', () => {
    expect(monthGrid(2028, 1).filter((c) => c.day).length).toBe(29);
    expect(monthGrid(2026, 5)[0]?.day).toBe(1); // June 2026 starts on Monday
  });
});

describe('relativeDay', () => {
  const now = new Date(2026, 9, 8, 7);
  it('says today and yesterday by calendar day, not by 24 hours', () => {
    expect(relativeDay(new Date(2026, 9, 8, 0, 5).getTime(), now)).toBe('today');
    expect(relativeDay(new Date(2026, 9, 7, 23, 50).getTime(), now)).toBe('yesterday');
    expect(relativeDay(new Date(2026, 9, 6).getTime(), now)).toEqual(new Date(2026, 9, 6));
  });
});
