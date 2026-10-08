import { describe, expect, it } from 'vitest';
import type { Cue } from '../timer/plan';
import type { CuePlayer } from '../timer/scheduler';
import { breathCues, startBreathing, type BreathConfig } from './session';

const coherence: BreathConfig = {
  phases: { inhale: 5, holdIn: 0, exhale: 5, holdOut: 0 },
  counting: false,
  minutes: 6,
  sound: true,
};

describe('breathCues', () => {
  it('one tone per inhale and exhale, then a soft closing bowl', () => {
    const cues = breathCues(coherence, 360);
    expect(cues.filter((c) => c.reason === 'breath-in')).toHaveLength(36);
    expect(cues.filter((c) => c.reason === 'breath-out')).toHaveLength(36);
    expect(cues.at(-1)).toMatchObject({ at: 360, instrument: 'bowl', reason: 'end' });
  });

  it('no tones for holds; silent mode keeps only the closing bowl', () => {
    const square = { ...coherence, phases: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 } };
    expect(breathCues(square, 32).filter((c) => c.reason !== 'end')).toHaveLength(4);
    expect(breathCues({ ...coherence, sound: false }, 360)).toHaveLength(1);
  });
});

describe('startBreathing', () => {
  it('runs whole breaths and reports the pacer from the absolute clock', () => {
    let wall = 0;
    const played: Cue[] = [];
    const player: CuePlayer = {
      now: () => wall / 1000,
      play: (cue) => {
        played.push(cue);
        return { cancel: () => undefined };
      },
    };
    const config = {
      ...coherence,
      minutes: 1,
      phases: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
    };
    const session = startBreathing(config, { now: () => wall, player });
    expect(session.total).toBe(76);
    wall = 5_000;
    expect(session.snapshot().pacer.phase).toBe('holdIn');
    wall = 12_000;
    expect(session.snapshot().pacer.phase).toBe('exhale');
    wall = 76_000;
    expect(session.snapshot().finished).toBe(true);
  });
});
