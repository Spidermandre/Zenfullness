import { describe, expect, it } from 'vitest';
import {
  breathsPerMinute,
  BUILT_IN,
  clampPhases,
  cycleLength,
  pacerAt,
  phaseStarts,
  wholeBreaths,
  type Phases,
} from './patterns';

const byId = (id: string) => {
  const p = BUILT_IN.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};

describe('built-in patterns', () => {
  it('coherence is 6 breaths per minute', () => {
    expect(breathsPerMinute(byId('coherence').phases)).toBe(6);
  });
  it('4-7-8 and square have the expected cycles', () => {
    expect(cycleLength(byId('long478').phases)).toBe(19);
    expect(cycleLength(byId('square').phases)).toBe(16);
  });
  it('long exhalation patterns exhale longer than they inhale', () => {
    for (const id of ['long46', 'long478']) {
      const { inhale, exhale } = byId(id).phases;
      expect(exhale).toBeGreaterThan(inhale);
    }
  });
});

describe('pacerAt', () => {
  const square: Phases = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 };

  it('walks through the four phases', () => {
    expect(pacerAt(square, 0).phase).toBe('inhale');
    expect(pacerAt(square, 4).phase).toBe('holdIn');
    expect(pacerAt(square, 8).phase).toBe('exhale');
    expect(pacerAt(square, 12).phase).toBe('holdOut');
    expect(pacerAt(square, 16)).toMatchObject({ phase: 'inhale', cycle: 1 });
  });

  it('fullness rises on inhale, holds, falls on exhale, rests empty', () => {
    expect(pacerAt(square, 0).fullness).toBeCloseTo(0);
    expect(pacerAt(square, 2).fullness).toBeCloseTo(0.5);
    expect(pacerAt(square, 6).fullness).toBe(1);
    expect(pacerAt(square, 10).fullness).toBeCloseTo(0.5);
    expect(pacerAt(square, 14).fullness).toBe(0);
  });

  it('is continuous across phase boundaries (no visual jumps)', () => {
    const p = byId('long478').phases;
    for (let t = 0.001; t < 40; t += 0.01) {
      const delta = Math.abs(pacerAt(p, t + 0.01).fullness - pacerAt(p, t).fullness);
      expect(delta).toBeLessThan(0.02);
    }
  });

  it('skips zero-length holds', () => {
    const p = byId('coherence').phases;
    expect(pacerAt(p, 5).phase).toBe('exhale');
    expect(pacerAt(p, 10)).toMatchObject({ phase: 'inhale', cycle: 1 });
  });

  it('susokukan counts 1 to 10 and starts again', () => {
    const p = byId('susokukan').phases;
    const at = (breath: number) => pacerAt(p, breath * cycleLength(p) + 5).count;
    expect([0, 1, 9, 10, 11].map(at)).toEqual([1, 2, 10, 1, 2]);
  });
});

describe('phaseStarts', () => {
  it('lists every non-empty phase start within the duration', () => {
    const starts = phaseStarts({ inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }, 20);
    expect(starts).toEqual([
      { at: 0, phase: 'inhale' },
      { at: 4, phase: 'exhale' },
      { at: 10, phase: 'inhale' },
      { at: 14, phase: 'exhale' },
    ]);
  });
});

describe('session length', () => {
  it('rounds up to whole breaths', () => {
    expect(wholeBreaths({ inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, 1)).toBe(76);
    expect(wholeBreaths({ inhale: 5, holdIn: 0, exhale: 5, holdOut: 0 }, 6)).toBe(360);
  });
});

describe('clampPhases', () => {
  it('keeps custom patterns breathable', () => {
    expect(clampPhases({ inhale: 0, holdIn: -2, exhale: 99, holdOut: 3.4 })).toEqual({
      inhale: 1,
      holdIn: 0,
      exhale: 20,
      holdOut: 3,
    });
  });
});
