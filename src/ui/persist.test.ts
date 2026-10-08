import { describe, expect, it } from 'vitest';
import { RESTORE_GRACE_MS, shouldRestore } from './persist';

const clock = (over = {}) => ({ startedAt: 0, pausedTotal: 0, pausedAt: undefined, ...over });

describe('shouldRestore', () => {
  it('restores a practice still running', () => {
    expect(shouldRestore({ clock: clock(), endedAt: undefined }, 1500, 600_000)).toBe(true);
  });
  it('restores shortly after the planned end (to show the end and record it)', () => {
    expect(shouldRestore({ clock: clock(), endedAt: undefined }, 1500, 1_500_000 + 60_000)).toBe(
      true,
    );
  });
  it('drops a practice whose end passed long ago', () => {
    const late = 1_500_000 + RESTORE_GRACE_MS + 1;
    expect(shouldRestore({ clock: clock(), endedAt: undefined }, 1500, late)).toBe(false);
  });
  it('counts pauses when computing the end', () => {
    const state = { clock: clock({ pausedTotal: 900_000 }), endedAt: undefined };
    expect(shouldRestore(state, 1500, 1_500_000 + RESTORE_GRACE_MS + 1)).toBe(true);
  });
  it('restores a recent pause, drops an old one, never an ended practice', () => {
    expect(
      shouldRestore({ clock: clock({ pausedAt: 0 }), endedAt: undefined }, 60, 3_600_000),
    ).toBe(true);
    expect(
      shouldRestore({ clock: clock({ pausedAt: 0 }), endedAt: undefined }, 60, 13 * 3_600_000),
    ).toBe(false);
    expect(shouldRestore({ clock: clock(), endedAt: 1000 }, 1500, 2000)).toBe(false);
  });
});
