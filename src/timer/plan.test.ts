import { describe, expect, it } from 'vitest';
import { buildPlan, positionAt, sequence, STRIKE_SPACING, type SittingConfig } from './plan';

const base: SittingConfig = {
  periods: [{ kind: 'zazen', minutes: 25 }],
  prepSeconds: 0,
  bells: 'traditional',
  midBell: false,
  showTime: false,
  ambient: false,
};

describe('buildPlan', () => {
  it('single 25-minute zazen: three strikes to open, one to close, at the exact instants', () => {
    const plan = buildPlan(base);
    expect(plan.total).toBe(1500);
    const opening = plan.cues.filter((c) => c.reason === 'zazen-start');
    expect(opening.map((c) => c.at)).toEqual([0, 4.5, 9]);
    const end = plan.cues.filter((c) => c.reason === 'end');
    expect(end).toHaveLength(1);
    expect(end[0]?.at).toBe(1500);
  });

  it('preparation shifts everything and is its own segment', () => {
    const plan = buildPlan({ ...base, prepSeconds: 10 });
    expect(plan.segments[0]).toEqual({ kind: 'prep', number: 0, start: 0, end: 10 });
    expect(plan.cues[0]?.at).toBe(10);
    expect(plan.total).toBe(1510);
  });

  it('zazen · kinhin · zazen: 3 + 2 + 3 + 1 strikes', () => {
    const plan = buildPlan({ ...base, periods: sequence(25, 10, 2) });
    expect(plan.periodCount).toBe(3);
    expect(plan.total).toBe((25 + 10 + 25) * 60);
    const counts = plan.cues.reduce<Record<string, number>>((acc, c) => {
      acc[c.reason] = (acc[c.reason] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ 'zazen-start': 6, 'kinhin-start': 2, end: 1 });
    const kinhin = plan.cues.filter((c) => c.reason === 'kinhin-start').map((c) => c.at);
    expect(kinhin).toEqual([1500, 1500 + STRIKE_SPACING.bowl]);
  });

  it('optional mid bell sounds halfway through each zazen period, softer', () => {
    const plan = buildPlan({ ...base, midBell: true, periods: sequence(20, 5, 2) });
    const mids = plan.cues.filter((c) => c.reason === 'mid');
    expect(mids.map((c) => c.at)).toEqual([600, 1200 + 300 + 600]);
    expect(mids.every((c) => c.gain < 1)).toBe(true);
  });

  it('bell sets change the instrument, not the counts', () => {
    const wood = buildPlan({ ...base, bells: 'wood', midBell: true });
    expect(new Set(wood.cues.filter((c) => c.reason !== 'mid').map((c) => c.instrument))).toEqual(
      new Set(['han']),
    );
    expect(wood.cues.find((c) => c.reason === 'mid')?.instrument).toBe('mokugyo');
    expect(buildPlan({ ...base, bells: 'inkin' }).cues.every((c) => c.instrument === 'inkin')).toBe(
      true,
    );
  });

  it('clamps nonsensical durations', () => {
    const plan = buildPlan({ ...base, periods: [{ kind: 'zazen', minutes: 0 }], prepSeconds: -5 });
    expect(plan.total).toBe(60);
  });
});

describe('positionAt', () => {
  const plan = buildPlan({ ...base, prepSeconds: 10, periods: sequence(1, 1, 2) });

  it('reports preparation, then each period with remaining time', () => {
    expect(positionAt(plan, 0).segment?.kind).toBe('prep');
    expect(positionAt(plan, 10).segment).toMatchObject({ kind: 'zazen', number: 1 });
    expect(positionAt(plan, 75).segment).toMatchObject({ kind: 'kinhin', number: 2 });
    expect(positionAt(plan, 75).remaining).toBe(55);
    expect(positionAt(plan, 189).segment).toMatchObject({ kind: 'zazen', number: 3 });
  });

  it('is done exactly at the total', () => {
    expect(positionAt(plan, plan.total - 0.001).done).toBe(false);
    expect(positionAt(plan, plan.total).done).toBe(true);
  });
});
