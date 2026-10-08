import { describe, expect, it } from 'vitest';
import { seededRandom } from '../random';
import { createDrift, poissonTimes } from './modulation';
import { fillNoise, LOOP_SECONDS, type NoiseColor } from './noise';

/** Lag-1 autocorrelation: higher = more low-frequency energy. */
function lag1(x: Float32Array): number {
  let num = 0;
  let den = 0;
  for (let i = 1; i < x.length; i++) {
    num += (x[i] ?? 0) * (x[i - 1] ?? 0);
    den += (x[i] ?? 0) ** 2;
  }
  return num / den;
}

describe('noise', () => {
  const make = (color: NoiseColor) => fillNoise(new Float32Array(48_000), color, seededRandom(3));

  it('all colours stay within headroom', () => {
    for (const color of ['white', 'pink', 'brown'] as const) {
      const x = make(color);
      expect(Math.max(...x.map(Math.abs))).toBeCloseTo(0.9, 5);
    }
  });

  it('white < pink < brown in low-frequency weight', () => {
    const white = lag1(make('white'));
    const pink = lag1(make('pink'));
    const brown = lag1(make('brown'));
    expect(Math.abs(white)).toBeLessThan(0.05);
    expect(pink).toBeGreaterThan(white);
    expect(brown).toBeGreaterThan(pink);
    expect(brown).toBeGreaterThan(0.9);
  });

  it('the two loops never realign (within 1 ms) during an hour', () => {
    const [a, b] = LOOP_SECONDS;
    for (let k = 1; k * a < 3600; k++) {
      const offset = Math.abs(k * a - Math.round((k * a) / b) * b);
      expect(offset).toBeGreaterThan(0.001);
    }
  });
});

describe('createDrift', () => {
  it('stays in bounds and keeps moving, without repeating', () => {
    const drift = createDrift(seededRandom(1), { min: 200, max: 800, speed: 0.05 });
    const values: number[] = [];
    for (let i = 0; i < 2000; i++) values.push(drift.next(2));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(200);
    expect(Math.max(...values)).toBeLessThanOrEqual(800);
    expect(new Set(values.map((v) => v.toFixed(3))).size).toBeGreaterThan(1900);
    // It explores most of the range over an hour.
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(300);
  });

  it('is slow: consecutive steps are small relative to the range', () => {
    const drift = createDrift(seededRandom(2), { min: 0, max: 1, speed: 0.02 });
    let prev = drift.value();
    for (let i = 0; i < 500; i++) {
      const v = drift.next(1);
      expect(Math.abs(v - prev)).toBeLessThan(0.1);
      prev = v;
    }
  });

  it('two drifts with different seeds differ', () => {
    const a = createDrift(seededRandom(1), { min: 0, max: 1, speed: 0.05 });
    const b = createDrift(seededRandom(2), { min: 0, max: 1, speed: 0.05 });
    expect(a.next(1)).not.toBe(b.next(1));
  });
});

describe('poissonTimes', () => {
  it('produces about rate × duration events, sorted, inside the window', () => {
    const times = poissonTimes(seededRandom(4), 5, 10, 610);
    expect(times.length).toBeGreaterThan(2700);
    expect(times.length).toBeLessThan(3300);
    expect(times[0]).toBeGreaterThanOrEqual(10);
    expect(times.at(-1)).toBeLessThan(610);
    expect(times.every((t, i) => i === 0 || t > (times[i - 1] ?? 0))).toBe(true);
  });

  it('no events at zero rate', () => {
    expect(poissonTimes(seededRandom(1), 0, 0, 100)).toEqual([]);
  });
});

describe('mix', () => {
  const names = { rain: 'Pioggia', wind: 'Vento', water: 'Acqua', drone: 'Bordone' };
  it('labels the active layers like the design ("Pioggia · bordone")', async () => {
    const { DEFAULT_MIX, mixLabel } = await import('./mix');
    expect(mixLabel(DEFAULT_MIX, names, 'Silenzio')).toBe('Pioggia · bordone');
  });
  it('treats a muted layer as off', async () => {
    const { DEFAULT_MIX, activeLayers, mixLabel } = await import('./mix');
    const mix = { ...DEFAULT_MIX, rain: { on: true, level: 0 }, drone: { on: false, level: 1 } };
    expect(activeLayers(mix)).toEqual([]);
    expect(mixLabel(mix, names, 'Silenzio')).toBe('Silenzio');
  });
});
