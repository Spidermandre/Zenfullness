import { jitter, type Random } from './random';
import type { Instrument } from '../timer/plan';

/**
 * Modal synthesis recipes. A struck bowl, bell or wooden block is modelled as a sum of
 * exponentially decaying sine "modes" at inharmonic frequency ratios, plus a short
 * filtered-noise transient for the mallet contact. Every strike draws small random
 * variations (pitch, mode balance, beating, decay) so no two strikes sound identical.
 *
 * This module is pure: it only produces numbers. `render.ts` turns them into audio.
 */
export interface Mode {
  frequency: number;
  /** Peak amplitude, 0..1. */
  gain: number;
  /** Time for the mode to fall by 60 dB, seconds. */
  t60: number;
}

export interface StrikeSpec {
  modes: Mode[];
  /** Attack time of the modes, seconds. */
  attack: number;
  /** Mallet transient: band-passed noise burst. */
  noise: { gain: number; duration: number; frequency: number; q: number };
  /** Overall level, 0..1. */
  level: number;
  /** When every component has decayed to silence, seconds after the strike. */
  duration: number;
}

interface Recipe {
  fundamental: number;
  /** Frequency ratios of the modes relative to the fundamental (inharmonic). */
  ratios: number[];
  gains: number[];
  /** Decay of the fundamental; higher modes decay faster. */
  t60: number;
  /** Exponent of the decay's frequency dependence: t60_k = t60 · ratio_k^−decayTilt. */
  decayTilt: number;
  /** Relative split of each mode into a doublet; produces the slow beating of real bowls. */
  doublet: number;
  attack: number;
  noise: StrikeSpec['noise'];
  level: number;
}

const RECIPES: Record<Instrument, Recipe> = {
  // Keisu / singing bowl: deep, long, with audible beating.
  bowl: {
    fundamental: 196,
    ratios: [1, 2.76, 5.08, 7.85, 11.1],
    gains: [1, 0.55, 0.32, 0.16, 0.08],
    t60: 26,
    decayTilt: 0.75,
    doublet: 0.0035,
    attack: 0.004,
    noise: { gain: 0.05, duration: 0.03, frequency: 2400, q: 1.2 },
    level: 0.4,
  },
  // Inkin: small high hand bell, bright and shorter.
  inkin: {
    fundamental: 1180,
    ratios: [1, 2.32, 4.25, 6.63],
    gains: [1, 0.45, 0.2, 0.08],
    t60: 7,
    decayTilt: 0.6,
    doublet: 0.0015,
    attack: 0.002,
    noise: { gain: 0.04, duration: 0.015, frequency: 6000, q: 1.5 },
    level: 0.35,
  },
  // Han: thick wooden board struck with a mallet. Dull, very short.
  han: {
    fundamental: 310,
    ratios: [1, 2.57, 4.43, 6.71],
    gains: [1, 0.6, 0.3, 0.15],
    t60: 0.45,
    decayTilt: 0.5,
    doublet: 0,
    attack: 0.001,
    noise: { gain: 0.35, duration: 0.025, frequency: 1500, q: 0.9 },
    level: 0.5,
  },
  // Mokugyo: hollow wooden fish. A clear hollow "tok".
  mokugyo: {
    fundamental: 520,
    ratios: [1, 1.9, 3.3],
    gains: [1, 0.35, 0.12],
    t60: 0.3,
    decayTilt: 0.5,
    doublet: 0,
    attack: 0.001,
    noise: { gain: 0.25, duration: 0.012, frequency: 3000, q: 1.1 },
    level: 0.55,
  },
  // Breath cues: soft, short glass-like tones with a slow swell, no mallet click.
  breathIn: {
    fundamental: 528,
    ratios: [1, 2.76, 5.4],
    gains: [1, 0.12, 0.04],
    t60: 3.2,
    decayTilt: 0.6,
    doublet: 0.002,
    attack: 0.35,
    noise: { gain: 0, duration: 0.01, frequency: 2000, q: 1 },
    level: 0.16,
  },
  breathOut: {
    fundamental: 396,
    ratios: [1, 2.76, 5.4],
    gains: [1, 0.12, 0.04],
    t60: 4,
    decayTilt: 0.6,
    doublet: 0.002,
    attack: 0.45,
    noise: { gain: 0, duration: 0.01, frequency: 2000, q: 1 },
    level: 0.16,
  },
};

/** Builds the spec of one strike. `random` drives the per-strike variation. */
export function strikeSpec(instrument: Instrument, random: Random, gain = 1): StrikeSpec {
  const recipe = RECIPES[instrument];
  const fundamental = jitter(random, recipe.fundamental, 0.006);
  const modes: Mode[] = [];

  recipe.ratios.forEach((ratio, k) => {
    const frequency = fundamental * jitter(random, ratio, 0.004);
    const modeGain = Math.min(1, jitter(random, recipe.gains[k] ?? 0, 0.2));
    const t60 = jitter(random, recipe.t60 * ratio ** -recipe.decayTilt, 0.12);
    if (recipe.doublet > 0) {
      const split = jitter(random, recipe.doublet, 0.5);
      const balance = 0.35 + random() * 0.3;
      modes.push(
        { frequency: frequency * (1 - split / 2), gain: modeGain * balance, t60 },
        { frequency: frequency * (1 + split / 2), gain: modeGain * (1 - balance), t60 },
      );
    } else {
      modes.push({ frequency, gain: modeGain, t60 });
    }
  });

  const level = recipe.level * Math.max(0, Math.min(1, jitter(random, gain, 0.05)));
  const duration = Math.max(...modes.map((m) => m.t60), recipe.noise.duration) + recipe.attack;
  return {
    modes,
    attack: recipe.attack,
    noise: { ...recipe.noise, gain: jitter(random, recipe.noise.gain, 0.25) },
    level,
    duration,
  };
}
