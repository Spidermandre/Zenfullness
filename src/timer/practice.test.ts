import { describe, expect, it } from 'vitest';
import type { Cue } from './plan';
import { startTimedPractice, type PracticeState } from './practice';
import type { CuePlayer } from './scheduler';

const cues: Cue[] = [
  { at: 0, instrument: 'bowl', gain: 1, reason: 'zazen-start' },
  { at: 300, instrument: 'bowl', gain: 0.5, reason: 'mid' },
  { at: 600, instrument: 'bowl', gain: 1, reason: 'end' },
];

function harness() {
  let wall = 1_000_000;
  const played: { cue: Cue; when: number }[] = [];
  const player: CuePlayer = {
    now: () => 50,
    play: (cue, when) => {
      played.push({ cue, when });
      return { cancel: () => undefined };
    },
  };
  return { player, played, now: () => wall, set: (ms: number) => (wall = ms) };
}

describe('restoring a practice after a reload', () => {
  it('continues from the absolute clock and only schedules the remaining cues', () => {
    const before = harness();
    const states: PracticeState[] = [];
    const first = startTimedPractice(cues, 600, {
      now: before.now,
      player: before.player,
      onChange: (s) => states.push(s),
    });
    before.set(1_000_000 + 120_000);
    first.pause();
    before.set(1_000_000 + 180_000);
    first.resume();
    expect(states).toHaveLength(3); // start, pause, resume

    // The app is killed; it is reopened 4 minutes later.
    const saved = states.at(-1);
    if (!saved) throw new Error('no saved state');
    const after = harness();
    after.set(1_000_000 + 420_000);
    const restored = startTimedPractice(cues, 600, {
      now: after.now,
      player: after.player,
      restore: saved,
    });
    // 420 s since start, minus a 60 s pause.
    expect(restored.snapshot().elapsed).toBe(360);
    expect(after.played.map((p) => p.cue.reason)).toEqual(['end']);
    expect(after.played[0]?.when).toBe(50 + 240);
  });

  it('a restored paused practice stays paused and schedules nothing', () => {
    const h = harness();
    const restored = startTimedPractice(cues, 600, {
      now: h.now,
      player: h.player,
      restore: { clock: { startedAt: 0, pausedTotal: 0, pausedAt: 100_000 }, endedAt: undefined },
    });
    expect(restored.snapshot()).toMatchObject({ paused: true, finished: false });
    expect(h.played).toEqual([]);
  });

  it('a restored practice past its end is finished, with no bells', () => {
    const h = harness();
    const restored = startTimedPractice(cues, 600, {
      now: h.now,
      player: h.player,
      restore: { clock: { startedAt: 0, pausedTotal: 0, pausedAt: undefined }, endedAt: undefined },
    });
    expect(restored.snapshot()).toMatchObject({ finished: true, endedEarly: false, elapsed: 600 });
    expect(h.played).toEqual([]);
  });
});
