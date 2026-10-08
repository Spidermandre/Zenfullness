import { describe, expect, it } from 'vitest';
import type { Cue, SittingConfig } from './plan';
import type { CuePlayer } from './scheduler';
import { startSitting } from './session';

function harness() {
  let wall = 1_000_000;
  let audio = 0;
  const played: { cue: Cue; when: number; cancelled: boolean }[] = [];
  const player: CuePlayer = {
    now: () => audio,
    play(cue, when) {
      const p = { cue, when, cancelled: false };
      played.push(p);
      return { cancel: () => void (p.cancelled = true) };
    },
  };
  return {
    deps: { now: () => wall, player },
    played,
    /** Advances wall and audio clocks together. */
    wait(seconds: number) {
      wall += seconds * 1000;
      audio += seconds;
    },
    /** Advances only the wall clock (audio context suspended by the OS). */
    waitSuspended(seconds: number) {
      wall += seconds * 1000;
    },
  };
}

const config: SittingConfig = {
  periods: [{ kind: 'zazen', minutes: 25 }],
  prepSeconds: 10,
  bells: 'traditional',
  midBell: false,
  showTime: false,
};

describe('sitting', () => {
  it('a 25-minute sitting ends at exactly 25 min + preparation, final bell scheduled there', () => {
    const h = harness();
    const sitting = startSitting(config, h.deps);
    const end = h.played.find((p) => p.cue.reason === 'end');
    expect(end?.when).toBe(1510);
    h.wait(1509.9);
    expect(sitting.snapshot().finished).toBe(false);
    h.wait(0.1);
    expect(sitting.snapshot()).toMatchObject({
      finished: true,
      endedEarly: false,
      elapsed: 1510,
      practiced: 1500,
    });
  });

  it('pauses: the end moves later by the pause length', () => {
    const h = harness();
    const sitting = startSitting(config, h.deps);
    h.wait(600);
    sitting.pause();
    h.wait(120);
    expect(sitting.snapshot().elapsed).toBe(600);
    sitting.resume();
    const live = h.played.filter((p) => !p.cancelled && p.cue.reason === 'end');
    expect(live).toHaveLength(1);
    expect(live[0]?.when).toBe(720 + 910);
  });

  it('after an OS audio interruption, resync puts the bell back on time', () => {
    const h = harness();
    const sitting = startSitting(config, h.deps);
    h.wait(100);
    h.waitSuspended(300); // audio clock frozen for 5 minutes, wall clock kept going
    sitting.resync();
    const live = h.played.filter((p) => !p.cancelled && p.cue.reason === 'end');
    expect(live).toHaveLength(1);
    // Audio clock is at 100; 400 s of the 1510 have elapsed.
    expect(live[0]?.when).toBe(100 + 1510 - 400);
  });

  it('ending early rings one closing strike now and freezes the elapsed time', () => {
    const h = harness();
    const sitting = startSitting(config, h.deps);
    h.wait(300);
    sitting.end();
    h.wait(60);
    const snap = sitting.snapshot();
    expect(snap).toMatchObject({ finished: true, endedEarly: true, elapsed: 300 });
    const closing = h.played.filter((p) => p.cue.reason === 'end' && !p.cancelled);
    expect(closing).toHaveLength(1);
    expect(closing[0]?.when).toBe(300);
  });

  it('reports the current segment for the screen label', () => {
    const h = harness();
    const sitting = startSitting(config, h.deps);
    expect(sitting.snapshot().position.segment?.kind).toBe('prep');
    h.wait(11);
    expect(sitting.snapshot().position.segment).toMatchObject({ kind: 'zazen', number: 1 });
  });
});
