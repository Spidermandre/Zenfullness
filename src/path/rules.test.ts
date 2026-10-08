import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../storage/log';
import { daysBetween, practiceDaysLastWeek, suggest, zazenLevel, type GuidedOption } from './rules';

/** A day in October 2026 at 07:00 local time. */
const at = (day: number, hour = 7) => new Date(2026, 9, day, hour).getTime();
const now = (day: number, hour = 8) => new Date(2026, 9, day, hour);

let n = 0;
function zazen(day: number, minutes: number, completed = true, hour = 7): LogEntry {
  n += 1;
  return {
    id: `z${String(n)}`,
    kind: 'zazen',
    startedAt: at(day, hour),
    endedAt: at(day, hour) + minutes * 60_000,
    plannedSeconds: minutes * 60,
    actualSeconds: completed ? minutes * 60 : minutes * 30,
    completed,
    detail: String(minutes),
  };
}
function other(kind: 'breath' | 'guided', day: number, detail = '', hour = 7): LogEntry {
  n += 1;
  return {
    id: `o${String(n)}`,
    kind,
    startedAt: at(day, hour),
    endedAt: at(day, hour) + 600_000,
    plannedSeconds: 600,
    actualSeconds: 600,
    completed: true,
    detail,
  };
}

const catalog: GuidedOption[] = [
  { id: 'postura', title: 'Postura', minutes: 10 },
  { id: 'respiro', title: 'Consapevolezza del respiro', minutes: 15 },
  { id: 'suoni', title: 'Suoni', minutes: 15 },
];

describe('first time', () => {
  it('starts with 10 minutes of zazen', () => {
    expect(suggest([], now(8), catalog)).toEqual({
      kind: 'zazen',
      minutes: 10,
      reasons: [{ code: 'first-time', values: { minutes: 10 } }],
    });
  });
});

describe('steady practice', () => {
  it('lengthens by 5 minutes after 3 complete sittings and 4+ practice days', () => {
    const history = [zazen(4, 10), zazen(5, 10), zazen(6, 10), zazen(7, 10)];
    const s = suggest(history, now(8), catalog);
    expect(s).toMatchObject({ kind: 'zazen', minutes: 15 });
    expect(s.reasons[0]?.code).toBe('steady-step-up');
  });

  it('does not lengthen again until 3 sittings at the new length', () => {
    const history = [zazen(4, 10), zazen(5, 10), zazen(6, 15), zazen(7, 15)];
    const s = suggest(history, now(8), catalog);
    expect(s).toMatchObject({ kind: 'zazen', minutes: 15 });
    expect(s.reasons[0]?.code).toBe('steady-stay');
  });

  it('steps from 15 to 20 once three 15-minute sittings are done', () => {
    const history = [zazen(4, 10), zazen(5, 15), zazen(6, 15), zazen(7, 15)];
    expect(suggest(history, now(8), catalog)).toMatchObject({ minutes: 20 });
  });

  it('never goes beyond 40 minutes', () => {
    const history = [zazen(4, 40), zazen(5, 40), zazen(6, 40), zazen(7, 40)];
    const s = suggest(history, now(8), catalog);
    expect(s).toMatchObject({ minutes: 40 });
    expect(s.reasons[0]?.code).toBe('steady-at-max');
  });

  it('stays put (no increase) while regularity is still building', () => {
    const history = [zazen(2, 20), zazen(5, 20), zazen(7, 20)];
    const s = suggest(history, now(8), catalog);
    expect(s).toMatchObject({ minutes: 20 });
    expect(s.reasons[0]).toEqual({ code: 'building-regularity', values: { days: 3, minutes: 20 } });
  });

  it('counts other practices for regularity, but only zazen for the length', () => {
    const history = [other('breath', 4), zazen(5, 20), zazen(6, 20), zazen(7, 20)];
    expect(suggest(history, now(8), catalog)).toMatchObject({ minutes: 25 });
  });

  it('uses the median of recent sittings, rounded to 5 minutes', () => {
    const history = [zazen(5, 25), zazen(6, 17), zazen(7, 20)];
    expect(zazenLevel(history, now(8)).minutes).toBe(20);
  });
});

describe('after a pause (quietly lower)', () => {
  it('3–6 days without practice: 5 minutes less', () => {
    const history = [zazen(1, 25), zazen(2, 25), zazen(3, 25)];
    const s = suggest(history, now(8), catalog);
    expect(s).toMatchObject({ kind: 'zazen', minutes: 20 });
    expect(s.reasons[0]).toEqual({ code: 'short-break', values: { days: 5, minutes: 20 } });
  });

  it('a week or more: 10 minutes less, never below 10', () => {
    expect(suggest([zazen(1, 30), zazen(2, 30)], now(20), catalog)).toMatchObject({ minutes: 20 });
    expect(suggest([zazen(1, 15)], now(20), catalog)).toMatchObject({ minutes: 10 });
  });

  it('one skipped day changes nothing', () => {
    const history = [zazen(3, 20), zazen(4, 20), zazen(5, 20), zazen(6, 20)];
    expect(suggest(history, now(8), catalog)).toMatchObject({ minutes: 25 });
  });
});

describe('sittings often cut short', () => {
  it('2 of the last 3 ended early: 5 minutes less', () => {
    const history = [zazen(5, 30), zazen(6, 30, false), zazen(7, 30, false)];
    const s = suggest(history, now(8), catalog);
    expect(s).toMatchObject({ minutes: 25 });
    expect(s.reasons[0]?.code).toBe('ended-early');
  });

  it('a single early end does not lower the length', () => {
    const history = [zazen(5, 30), zazen(6, 30), zazen(7, 30, false)];
    expect(suggest(history, now(8), catalog)).toMatchObject({ minutes: 30 });
  });
});

describe('time of day and variety', () => {
  it('already sat today: proposes the guided session least recently done', () => {
    const history = [zazen(8, 20, true, 7), other('guided', 6, 'Postura')];
    const s = suggest(history, now(8, 18), catalog);
    expect(s).toMatchObject({ kind: 'guided', session: { id: 'respiro' } });
    expect(s.reasons[0]?.code).toBe('already-sat-today');
  });

  it('late evening: a short long-exhalation breathing', () => {
    const s = suggest([zazen(6, 20), zazen(7, 20)], now(8, 22), catalog);
    expect(s).toMatchObject({ kind: 'breath', pattern: 'long46', minutes: 6 });
    expect(s.reasons[0]?.code).toBe('late-evening');
  });

  it('late evening is fine for someone who usually practises then', () => {
    const history = [zazen(5, 20, true, 22), zazen(6, 20, true, 22), zazen(7, 20, true, 23)];
    expect(suggest(history, now(8, 22), catalog)).toMatchObject({ kind: 'zazen' });
  });
});

describe('helpers', () => {
  it('counts calendar days, not 24-hour periods', () => {
    expect(
      daysBetween(new Date(2026, 9, 7, 23, 50).getTime(), new Date(2026, 9, 8, 0, 10).getTime()),
    ).toBe(1);
    expect(daysBetween(at(8, 1), at(8, 23))).toBe(0);
  });

  it('counts distinct practice days in the last week', () => {
    const history = [zazen(1, 10), zazen(2, 10), zazen(8, 10), other('breath', 8), zazen(7, 10)];
    expect(practiceDaysLastWeek(history, now(8))).toBe(3);
  });
});

describe('never punitive', () => {
  it('no reason code talks about missing, failing or streaks', () => {
    const codes = [
      suggest([], now(8), catalog),
      suggest([zazen(1, 25)], now(20), catalog),
      suggest([zazen(5, 30), zazen(6, 30, false), zazen(7, 30, false)], now(8), catalog),
    ].flatMap((s) => s.reasons.map((r) => r.code));
    for (const code of codes) expect(code).not.toMatch(/miss|fail|streak|lost/);
  });
});
