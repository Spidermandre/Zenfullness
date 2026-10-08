import type { Random } from '../random';

/**
 * Noise generators (pure: they fill arrays). White is flat; pink falls 3 dB/octave
 * (Paul Kellet's economy filter); brown falls 6 dB/octave (leaky integrator).
 * Buffers of different, non-multiple lengths are looped together so the combined
 * texture never repeats audibly.
 */
export type NoiseColor = 'white' | 'pink' | 'brown';

export function fillNoise(out: Float32Array, color: NoiseColor, random: Random): Float32Array {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const white = random() * 2 - 1;
    if (color === 'white') {
      out[i] = white;
    } else if (color === 'pink') {
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      out[i] = b0 + b1 + b2 + white * 0.1848;
    } else {
      last = (last + 0.02 * white) / 1.02;
      out[i] = last;
    }
  }
  // Normalise to a peak of 0.9 so every colour has the same headroom.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] = ((out[i] ?? 0) / peak) * 0.9;
  return out;
}

/** Lengths (seconds) of the looped buffers: incommensurate, so loops never line up. */
export const LOOP_SECONDS = [7.31, 11.83] as const;
