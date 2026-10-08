import { describe, expect, it } from 'vitest';
import { elapsedSeconds, isPaused, pauseClock, resumeClock, startClock } from './clock';

const T0 = 1_760_000_000_000;

describe('session clock', () => {
  it('derives elapsed time from absolute instants', () => {
    const clock = startClock(T0);
    expect(elapsedSeconds(clock, T0)).toBe(0);
    expect(elapsedSeconds(clock, T0 + 1500_000)).toBe(1500);
  });

  it('is unaffected by how often (or rarely) it is read — a throttled tab', () => {
    const clock = startClock(T0);
    // A background tab may only run once every few minutes; one read is enough.
    expect(elapsedSeconds(clock, T0 + 25 * 60_000 + 3)).toBeCloseTo(1500.003, 6);
  });

  it('excludes pauses, including several', () => {
    let clock = startClock(T0);
    clock = pauseClock(clock, T0 + 60_000);
    expect(isPaused(clock)).toBe(true);
    expect(elapsedSeconds(clock, T0 + 600_000)).toBe(60);
    clock = resumeClock(clock, T0 + 120_000);
    clock = pauseClock(clock, T0 + 180_000);
    clock = resumeClock(clock, T0 + 200_000);
    expect(elapsedSeconds(clock, T0 + 300_000)).toBe(300 - 60 - 20);
  });

  it('ignores redundant pause and resume calls', () => {
    let clock = startClock(T0);
    clock = resumeClock(clock, T0 + 1000);
    clock = pauseClock(clock, T0 + 2000);
    clock = pauseClock(clock, T0 + 5000);
    clock = resumeClock(clock, T0 + 7000);
    expect(elapsedSeconds(clock, T0 + 10_000)).toBe(5);
  });

  it('never goes negative if the wall clock steps backwards', () => {
    expect(elapsedSeconds(startClock(T0), T0 - 5000)).toBe(0);
  });
});
