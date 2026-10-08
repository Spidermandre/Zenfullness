import type { LogEntry } from '../storage/log';

/**
 * Adaptive path: proposes today's practice from the history.
 * Rule-based, local, transparent, no AI. Documented in ./RULES.md; every rule is tested.
 *
 * Principles: gradual increases only when practice is steady; quiet decreases after a
 * pause (no comment on the card, the reason is visible only under "Perché?"); never
 * punitive, no streaks, no counters. The proposal can always be ignored.
 */

export const START_MINUTES = 10;
export const MAX_MINUTES = 40;
export const STEP_MINUTES = 5;
/** Practice days in the last 7 needed to call the practice steady. */
export const STEADY_DAYS = 4;
/** Completed sittings at the current length needed before lengthening. */
export const SITTINGS_BEFORE_STEP = 3;
export const SHORT_BREAK_DAYS = 3;
export const LONG_BREAK_DAYS = 7;
/** Late evening: from 21:00 to 04:59. */
export const EVENING_FROM_HOUR = 21;
export const EVENING_UNTIL_HOUR = 5;
export const EVENING_BREATH_MINUTES = 6;

export type ReasonCode =
  | 'first-time'
  | 'steady-step-up'
  | 'steady-at-max'
  | 'steady-stay'
  | 'building-regularity'
  | 'short-break'
  | 'long-break'
  | 'ended-early'
  | 'already-sat-today'
  | 'late-evening';

export interface Reason {
  code: ReasonCode;
  /** Values used by the explanation text (days, minutes, counts). */
  values: Record<string, number>;
}

export interface GuidedOption {
  id: string;
  title: string;
  minutes: number;
}

export type Suggestion =
  | { kind: 'zazen'; minutes: number; reasons: Reason[] }
  | { kind: 'breath'; pattern: 'long46'; minutes: number; reasons: Reason[] }
  | { kind: 'guided'; session: GuidedOption; reasons: Reason[] };

const DAY = 86_400_000;

function dayStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between two instants (local time). */
export function daysBetween(earlier: number, later: number): number {
  return Math.round((dayStart(later) - dayStart(earlier)) / DAY);
}

function clampMinutes(m: number): number {
  const rounded = Math.round(m / STEP_MINUTES) * STEP_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(START_MINUTES, rounded));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function plannedMinutes(e: LogEntry): number {
  return e.plannedSeconds / 60;
}

/** The hour band (0 morning, 1 afternoon, 2 evening, 3 night) of a timestamp. */
function band(t: number): number {
  const h = new Date(t).getHours();
  if (h >= 5 && h < 12) return 0;
  if (h >= 12 && h < 18) return 1;
  if (h >= 18 && h < EVENING_FROM_HOUR) return 2;
  return 3;
}

function isLateEvening(now: Date): boolean {
  const h = now.getHours();
  return h >= EVENING_FROM_HOUR || h < EVENING_UNTIL_HOUR;
}

/** Practice days (any kind) in the 7 days ending today. */
export function practiceDaysLastWeek(history: readonly LogEntry[], now: Date): number {
  const days = new Set<number>();
  for (const e of history) {
    const ago = daysBetween(e.startedAt, now.getTime());
    if (ago >= 0 && ago < 7) days.add(dayStart(e.startedAt));
  }
  return days.size;
}

/** The zazen length the practice has settled on, and why it changes today. */
export function zazenLevel(
  history: readonly LogEntry[],
  now: Date,
): { minutes: number; reasons: Reason[] } {
  const zazen = history
    .filter((e) => e.kind === 'zazen' && e.startedAt <= now.getTime())
    .sort((a, b) => b.startedAt - a.startedAt);
  const all = [...history].sort((a, b) => b.startedAt - a.startedAt);
  const last = all[0];

  if (!last || zazen.length === 0) {
    return {
      minutes: START_MINUTES,
      reasons: [{ code: 'first-time', values: { minutes: START_MINUTES } }],
    };
  }

  const completed = zazen.filter((e) => e.completed);
  const recentCompleted = completed.slice(0, SITTINGS_BEFORE_STEP);
  let level = clampMinutes(
    recentCompleted.length > 0 ? median(recentCompleted.map(plannedMinutes)) : START_MINUTES,
  );

  // 1. A pause lowers the length quietly.
  const gap = daysBetween(last.startedAt, now.getTime());
  if (gap >= LONG_BREAK_DAYS) {
    const minutes = clampMinutes(level - 2 * STEP_MINUTES);
    return { minutes, reasons: [{ code: 'long-break', values: { days: gap, minutes } }] };
  }
  if (gap >= SHORT_BREAK_DAYS) {
    const minutes = clampMinutes(level - STEP_MINUTES);
    return { minutes, reasons: [{ code: 'short-break', values: { days: gap, minutes } }] };
  }

  // 2. Sittings that were often cut short: a shorter length is more realistic.
  const lastThree = zazen.slice(0, 3);
  const early = lastThree.filter((e) => !e.completed).length;
  if (lastThree.length === 3 && early >= 2) {
    const minutes = clampMinutes(level - STEP_MINUTES);
    return { minutes, reasons: [{ code: 'ended-early', values: { early, of: 3, minutes } }] };
  }

  // 3. Steady practice: lengthen by one step after enough complete sittings at this length.
  const days = practiceDaysLastWeek(history, now);
  if (days < STEADY_DAYS) {
    return {
      minutes: level,
      reasons: [{ code: 'building-regularity', values: { days, minutes: level } }],
    };
  }
  const atLevel = completed.slice(0, SITTINGS_BEFORE_STEP);
  const readyToStep =
    atLevel.length === SITTINGS_BEFORE_STEP &&
    atLevel.every((e) => clampMinutes(plannedMinutes(e)) >= level) &&
    zazen.slice(0, SITTINGS_BEFORE_STEP).every((e) => e.completed);
  if (readyToStep && level < MAX_MINUTES) {
    level = clampMinutes(level + STEP_MINUTES);
    return {
      minutes: level,
      reasons: [
        {
          code: 'steady-step-up',
          values: { days, sittings: SITTINGS_BEFORE_STEP, minutes: level },
        },
      ],
    };
  }
  if (level >= MAX_MINUTES) {
    return {
      minutes: level,
      reasons: [{ code: 'steady-at-max', values: { days, minutes: level } }],
    };
  }
  return { minutes: level, reasons: [{ code: 'steady-stay', values: { days, minutes: level } }] };
}

/** The guided session least recently practised (never practised first), by catalog order. */
function freshestGuided(
  history: readonly LogEntry[],
  catalog: readonly GuidedOption[],
): GuidedOption | undefined {
  let best: GuidedOption | undefined;
  let bestWhen = Infinity;
  for (const session of catalog) {
    const done = history.filter((e) => e.kind === 'guided' && e.detail === session.title);
    const when = done.length ? Math.max(...done.map((e) => e.startedAt)) : -Infinity;
    if (when < bestWhen) {
      best = session;
      bestWhen = when;
    }
  }
  return best;
}

/** Today's proposal. */
export function suggest(
  history: readonly LogEntry[],
  now: Date,
  catalog: readonly GuidedOption[],
): Suggestion {
  const level = zazenLevel(history, now);
  const today = history.filter((e) => daysBetween(e.startedAt, now.getTime()) === 0);

  // Already sat today: offer something different, never "more of the same".
  if (today.some((e) => e.kind === 'zazen')) {
    const session = freshestGuided(history, catalog);
    if (session) {
      return {
        kind: 'guided',
        session,
        reasons: [{ code: 'already-sat-today', values: { minutes: session.minutes } }],
      };
    }
  }

  // Late evening, unless this is when the practice usually happens: a short breathing.
  if (isLateEvening(now)) {
    const nightly = history.filter((e) => band(e.startedAt) === 3).length;
    const usual = history.length > 0 && nightly / history.length >= 0.5;
    if (!usual) {
      return {
        kind: 'breath',
        pattern: 'long46',
        minutes: EVENING_BREATH_MINUTES,
        reasons: [
          {
            code: 'late-evening',
            values: { minutes: EVENING_BREATH_MINUTES, hour: EVENING_FROM_HOUR },
          },
        ],
      };
    }
  }

  return { kind: 'zazen', minutes: level.minutes, reasons: level.reasons };
}
