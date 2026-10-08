import { describe, expect, it } from 'vitest';
import { strikeSpec } from './instruments';
import { seededRandom } from './random';
import type { Instrument } from '../timer/plan';

const INSTRUMENTS: Instrument[] = ['bowl', 'inkin', 'han', 'mokugyo'];

describe('strikeSpec', () => {
  it.each(INSTRUMENTS)('%s has inharmonic modes (not integer multiples)', (instrument) => {
    const spec = strikeSpec(instrument, seededRandom(1));
    const f0 = Math.min(...spec.modes.map((m) => m.frequency));
    const ratios = spec.modes.map((m) => m.frequency / f0).filter((r) => r > 1.5);
    expect(ratios.length).toBeGreaterThan(0);
    for (const r of ratios) expect(Math.abs(r - Math.round(r))).toBeGreaterThan(0.05);
  });

  it.each(INSTRUMENTS)('%s: higher modes decay faster', (instrument) => {
    const spec = strikeSpec(instrument, seededRandom(2));
    const sorted = [...spec.modes].sort((a, b) => a.frequency - b.frequency);
    const first = sorted[0];
    const last = sorted.at(-1);
    expect(first && last && last.t60 < first.t60).toBe(true);
  });

  it('bowl modes come in close doublets that beat slowly (0.1–5 Hz)', () => {
    const spec = strikeSpec('bowl', seededRandom(3));
    for (let i = 0; i < spec.modes.length; i += 2) {
      const a = spec.modes[i];
      const b = spec.modes[i + 1];
      if (!a || !b) throw new Error('missing doublet');
      const beat = b.frequency - a.frequency;
      if (i === 0) {
        expect(beat).toBeGreaterThan(0.1);
        expect(beat).toBeLessThan(5);
      }
    }
  });

  it('bells ring long, wood is short', () => {
    expect(strikeSpec('bowl', seededRandom(4)).duration).toBeGreaterThan(15);
    expect(strikeSpec('inkin', seededRandom(4)).duration).toBeGreaterThan(4);
    expect(strikeSpec('han', seededRandom(4)).duration).toBeLessThan(1);
    expect(strikeSpec('mokugyo', seededRandom(4)).duration).toBeLessThan(1);
  });

  it('no two strikes are identical, but all stay close to the instrument', () => {
    const random = seededRandom(5);
    const a = strikeSpec('bowl', random);
    const b = strikeSpec('bowl', random);
    expect(a.modes[0]?.frequency).not.toBe(b.modes[0]?.frequency);
    for (const spec of [a, b]) {
      const f0 = spec.modes[0]?.frequency ?? 0;
      expect(f0).toBeGreaterThan(190);
      expect(f0).toBeLessThan(200);
    }
  });

  it('is reproducible for a given seed', () => {
    expect(strikeSpec('inkin', seededRandom(9))).toEqual(strikeSpec('inkin', seededRandom(9)));
  });

  it('respects the requested gain and never exceeds full scale', () => {
    const soft = strikeSpec('bowl', seededRandom(6), 0.5);
    const loud = strikeSpec('bowl', seededRandom(6), 1);
    expect(soft.level).toBeLessThan(loud.level);
    for (const m of loud.modes) expect(m.gain).toBeLessThanOrEqual(1);
  });
});
