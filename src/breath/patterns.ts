/**
 * Breathing patterns and the pacer's position in time. Pure functions of elapsed time:
 * the visual pacer, the sound cues and the haptics all derive from the same numbers,
 * so they can never drift apart.
 */

export type PhaseKind = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export interface Phases {
  /** Seconds. */
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

export type PatternId = 'susokukan' | 'square' | 'long46' | 'long478' | 'coherence' | 'custom';

export interface Pattern {
  id: PatternId;
  phases: Phases;
  /** Susokukan: count exhalations from 1 to 10, then start again. */
  counting: boolean;
}

export const PHASE_ORDER: readonly PhaseKind[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];

export const BUILT_IN: readonly Pattern[] = [
  // Natural, unhurried rhythm; the practice is the counting, not the pace.
  { id: 'susokukan', phases: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }, counting: true },
  { id: 'square', phases: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }, counting: false },
  { id: 'long46', phases: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }, counting: false },
  { id: 'long478', phases: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, counting: false },
  // 5 s in, 5 s out = 6 breaths per minute (resonance / coherence breathing).
  { id: 'coherence', phases: { inhale: 5, holdIn: 0, exhale: 5, holdOut: 0 }, counting: false },
];

export const PHASE_LIMITS = {
  inhale: { min: 1, max: 15 },
  holdIn: { min: 0, max: 20 },
  exhale: { min: 1, max: 20 },
  holdOut: { min: 0, max: 20 },
} as const satisfies Record<PhaseKind, { min: number; max: number }>;

export function clampPhases(p: Phases): Phases {
  const clamp = (k: PhaseKind) =>
    Math.min(PHASE_LIMITS[k].max, Math.max(PHASE_LIMITS[k].min, Math.round(p[k])));
  return {
    inhale: clamp('inhale'),
    holdIn: clamp('holdIn'),
    exhale: clamp('exhale'),
    holdOut: clamp('holdOut'),
  };
}

export function cycleLength(p: Phases): number {
  return p.inhale + p.holdIn + p.exhale + p.holdOut;
}

export function breathsPerMinute(p: Phases): number {
  return 60 / cycleLength(p);
}

export interface PacerState {
  phase: PhaseKind;
  /** 0..1 progress within the phase. */
  progress: number;
  /** 0-based index of the current breath. */
  cycle: number;
  /** Lung "fullness" 0..1, eased: drives the sphere size. */
  fullness: number;
  /** Susokukan count 1..10 for the current breath. */
  count: number;
}

/** Smooth, symmetric easing (no velocity jump at the turn of the breath). */
function ease(x: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

export function pacerAt(phases: Phases, elapsed: number): PacerState {
  const length = cycleLength(phases);
  const t = Math.max(0, elapsed);
  const cycle = Math.floor(t / length);
  let within = t - cycle * length;

  for (const phase of PHASE_ORDER) {
    const duration = phases[phase];
    if (duration > 0 && within < duration) {
      const progress = within / duration;
      const fullness =
        phase === 'inhale'
          ? ease(progress)
          : phase === 'holdIn'
            ? 1
            : phase === 'exhale'
              ? 1 - ease(progress)
              : 0;
      return { phase, progress, cycle, fullness, count: (cycle % 10) + 1 };
    }
    within -= duration;
  }
  // Floating-point edge at the very end of a cycle.
  return {
    phase: 'inhale',
    progress: 0,
    cycle: cycle + 1,
    fullness: 0,
    count: ((cycle + 1) % 10) + 1,
  };
}

export interface PhaseStart {
  at: number;
  phase: PhaseKind;
}

/** Every phase start in [0, duration), for sound and haptic cues. Zero-length phases skipped. */
export function phaseStarts(phases: Phases, duration: number): PhaseStart[] {
  const out: PhaseStart[] = [];
  let t = 0;
  while (t < duration) {
    for (const phase of PHASE_ORDER) {
      if (phases[phase] <= 0) continue;
      if (t >= duration) break;
      out.push({ at: t, phase });
      t += phases[phase];
    }
  }
  return out;
}

/**
 * Session length rounded up to whole breaths, so a session never cuts a breath in half.
 */
export function wholeBreaths(phases: Phases, minutes: number): number {
  const length = cycleLength(phases);
  return Math.ceil((minutes * 60) / length) * length;
}
