import type { Random } from '../random';

/**
 * Slow, bounded, never-repeating control signals for the soundscapes.
 *
 * `createDrift` is a mean-reverting random walk (discrete Ornstein–Uhlenbeck): it
 * wanders around a centre, is pulled back gently, and is hard-clamped to [min, max].
 * Calling `next(dt)` every few seconds yields the target of the next parameter ramp.
 */
export interface DriftOptions {
  min: number;
  max: number;
  /** Typical change per second, in units of the range. */
  speed: number;
  /** Strength of the pull back to the centre, per second (0..1). */
  pull?: number;
  initial?: number;
}

export interface Drift {
  value(): number;
  next(dt: number): number;
}

export function createDrift(random: Random, options: DriftOptions): Drift {
  const { min, max, speed } = options;
  const pull = options.pull ?? 0.05;
  const centre = (min + max) / 2;
  const range = max - min;
  let v = options.initial ?? centre;
  return {
    value: () => v,
    next(dt) {
      const noise = (random() * 2 - 1) * speed * range * Math.sqrt(dt);
      v += (centre - v) * Math.min(1, pull * dt) + noise;
      v = Math.min(max, Math.max(min, v));
      return v;
    },
  };
}

/** Event times of a Poisson process with `rate` events/second in [from, to). */
export function poissonTimes(random: Random, rate: number, from: number, to: number): number[] {
  const times: number[] = [];
  if (rate <= 0) return times;
  let t = from;
  for (;;) {
    t += -Math.log(1 - random()) / rate;
    if (t >= to) return times;
    times.push(t);
  }
}
