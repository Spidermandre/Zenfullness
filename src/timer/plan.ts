/**
 * Sitting plan: turns a user configuration (periods, preparation, bells) into a flat
 * timeline of segments and sound cues, all expressed as offsets in seconds from the
 * moment the user pressed "start". Pure and deterministic.
 */

export type PeriodKind = 'zazen' | 'kinhin';
export type SegmentKind = 'prep' | PeriodKind;
export type Instrument = 'bowl' | 'inkin' | 'han' | 'mokugyo' | 'breathIn' | 'breathOut';

export interface Period {
  kind: PeriodKind;
  minutes: number;
}

/** Which instrument marks the transitions. All sets use the traditional strike counts. */
export type BellSet = 'traditional' | 'inkin' | 'wood';

export interface SittingConfig {
  periods: Period[];
  prepSeconds: number;
  bells: BellSet;
  /** One soft strike halfway through each zazen period. */
  midBell: boolean;
  showTime: boolean;
  /** Play the ambient soundscape during the sitting (fades out at the end). */
  ambient: boolean;
}

export interface Segment {
  kind: SegmentKind;
  /** 1-based index among the non-prep periods, 0 for preparation. */
  number: number;
  start: number;
  end: number;
}

export interface Cue {
  at: number;
  instrument: Instrument;
  /** 0..1 relative loudness. */
  gain: number;
  reason: 'zazen-start' | 'kinhin-start' | 'mid' | 'end' | 'breath-in' | 'breath-out';
}

export interface Plan {
  segments: Segment[];
  cues: Cue[];
  /** Offset at which the sitting is over (the final strike sounds here). */
  total: number;
  /** Number of zazen + kinhin periods. */
  periodCount: number;
}

/** Traditional counts: three strikes open zazen, two open kinhin, one closes the sitting. */
export const STRIKES = { 'zazen-start': 3, 'kinhin-start': 2, mid: 1, end: 1 } as const;

/** Seconds between consecutive strikes of the same group. */
export const STRIKE_SPACING: Record<Instrument, number> = {
  bowl: 4.5,
  inkin: 3,
  han: 1.6,
  mokugyo: 1.2,
  breathIn: 0,
  breathOut: 0,
};

const INSTRUMENTS: Record<BellSet, { main: Instrument; mid: Instrument }> = {
  traditional: { main: 'bowl', mid: 'bowl' },
  inkin: { main: 'inkin', mid: 'inkin' },
  wood: { main: 'han', mid: 'mokugyo' },
};

/** The instrument that marks transitions for a bell set. */
export function mainInstrument(bells: BellSet): Instrument {
  return INSTRUMENTS[bells].main;
}

export const MIN_PERIOD_MINUTES = 1;
export const MAX_PERIOD_MINUTES = 120;
export const MAX_PREP_SECONDS = 300;

export function clampMinutes(minutes: number): number {
  return Math.min(MAX_PERIOD_MINUTES, Math.max(MIN_PERIOD_MINUTES, Math.round(minutes)));
}

function strikes(
  at: number,
  count: number,
  instrument: Instrument,
  gain: number,
  reason: Cue['reason'],
): Cue[] {
  return Array.from({ length: count }, (_, i) => ({
    at: at + i * STRIKE_SPACING[instrument],
    instrument,
    gain,
    reason,
  }));
}

export function buildPlan(config: SittingConfig): Plan {
  const prep = Math.min(MAX_PREP_SECONDS, Math.max(0, config.prepSeconds));
  const { main, mid } = INSTRUMENTS[config.bells];
  const segments: Segment[] = [];
  const cues: Cue[] = [];

  if (prep > 0) segments.push({ kind: 'prep', number: 0, start: 0, end: prep });

  let cursor = prep;
  config.periods.forEach((period, i) => {
    const duration = clampMinutes(period.minutes) * 60;
    const start = cursor;
    const end = start + duration;
    segments.push({ kind: period.kind, number: i + 1, start, end });

    if (period.kind === 'zazen') {
      cues.push(...strikes(start, STRIKES['zazen-start'], main, 1, 'zazen-start'));
      if (config.midBell) cues.push(...strikes(start + duration / 2, STRIKES.mid, mid, 0.5, 'mid'));
    } else {
      cues.push(...strikes(start, STRIKES['kinhin-start'], main, 0.9, 'kinhin-start'));
    }
    cursor = end;
  });

  cues.push(...strikes(cursor, STRIKES.end, main, 1, 'end'));

  return { segments, cues, total: cursor, periodCount: config.periods.length };
}

export interface Position {
  segment: Segment | undefined;
  /** Seconds left in the current segment. */
  remaining: number;
  done: boolean;
}

/** Where the sitting is at `elapsed` seconds. */
export function positionAt(plan: Plan, elapsed: number): Position {
  if (elapsed >= plan.total) return { segment: undefined, remaining: 0, done: true };
  const segment = plan.segments.find((s) => elapsed >= s.start && elapsed < s.end);
  return { segment, remaining: segment ? segment.end - elapsed : 0, done: false };
}

/** Builds the classic sequence: zazen, then (kinhin, zazen) × (rounds − 1). */
export function sequence(zazenMinutes: number, kinhinMinutes: number, rounds: number): Period[] {
  const periods: Period[] = [{ kind: 'zazen', minutes: zazenMinutes }];
  for (let i = 1; i < rounds; i++) {
    periods.push(
      { kind: 'kinhin', minutes: kinhinMinutes },
      { kind: 'zazen', minutes: zazenMinutes },
    );
  }
  return periods;
}
