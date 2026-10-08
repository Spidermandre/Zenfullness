import { describe, expect, it } from 'vitest';
import { buildPlan, sequence, type Cue } from './plan';
import { createCueScheduler, type CuePlayer } from './scheduler';

/** Fake audio clock: records every strike with its audio time and whether it was cancelled. */
function fakePlayer(start = 100) {
  let audioNow = start;
  const strikes: { cue: Cue; when: number; cancelled: boolean }[] = [];
  const player: CuePlayer = {
    now: () => audioNow,
    play(cue, when) {
      const strike = { cue, when, cancelled: false };
      strikes.push(strike);
      return {
        cancel: () => {
          strike.cancelled = true;
        },
      };
    },
  };
  return {
    player,
    strikes,
    advance: (s: number) => (audioNow += s),
    live: () => strikes.filter((s) => !s.cancelled),
  };
}

const plan = buildPlan({
  periods: sequence(25, 10, 2),
  prepSeconds: 10,
  bells: 'traditional',
  midBell: false,
  showTime: false,
});

describe('cue scheduler', () => {
  it('hands every cue to the audio clock up front, at exact offsets', () => {
    const fake = fakePlayer(100);
    const scheduler = createCueScheduler(plan.cues, fake.player);
    scheduler.schedule(0);
    expect(fake.strikes).toHaveLength(plan.cues.length);
    const end = fake.strikes.at(-1);
    expect(end?.cue.reason).toBe('end');
    expect(end?.when).toBe(100 + plan.total);
  });

  it('cancels pending strikes on pause and reschedules only the remaining ones', () => {
    const fake = fakePlayer(0);
    const scheduler = createCueScheduler(plan.cues, fake.player);
    scheduler.schedule(0);
    // Pause 20 minutes in (audio clock advanced the same amount).
    fake.advance(1200);
    scheduler.cancel();
    expect(fake.live().filter((s) => s.when > 1200)).toHaveLength(0);
    // Resume after a 5-minute pause: elapsed is still 1200 s, audio clock is at 1500.
    fake.advance(300);
    scheduler.schedule(1200);
    const rescheduled = fake.strikes.slice(plan.cues.length);
    expect(rescheduled.every((s) => s.cue.at > 1200)).toBe(true);
    const kinhin = rescheduled.find((s) => s.cue.reason === 'kinhin-start');
    // Kinhin was due at 10 + 1500 s of session time = 310 s after the resume instant.
    expect(kinhin?.when).toBe(
      1500 + (plan.cues.find((c) => c.reason === 'kinhin-start')?.at ?? 0) - 1200,
    );
  });

  it('never repeats a strike that already began ringing', () => {
    const fake = fakePlayer(0);
    const scheduler = createCueScheduler(plan.cues, fake.player);
    scheduler.schedule(0);
    fake.advance(10.2); // first opening strike at 10 s has begun
    scheduler.cancel();
    scheduler.schedule(10.2);
    const firstStrikes = fake.strikes.filter((s) => s.cue === plan.cues[0]);
    expect(firstStrikes).toHaveLength(1);
    expect(firstStrikes[0]?.cancelled).toBe(false);
  });

  it('skips cues that are clearly late instead of ringing them out of time', () => {
    const fake = fakePlayer(0);
    const scheduler = createCueScheduler(plan.cues, fake.player);
    // Audio context came back after an interruption 30 s past the kinhin bell.
    const kinhinAt = plan.cues.find((c) => c.reason === 'kinhin-start')?.at ?? 0;
    scheduler.schedule(kinhinAt + 30);
    expect(scheduler.pending().some((c) => c.reason === 'kinhin-start')).toBe(false);
    expect(scheduler.pending().some((c) => c.reason === 'end')).toBe(true);
  });

  it('plays a cue due a moment ago immediately (within tolerance)', () => {
    const fake = fakePlayer(50);
    const scheduler = createCueScheduler(plan.cues, fake.player);
    scheduler.schedule(10.3);
    expect(fake.strikes[0]?.cue).toBe(plan.cues[0]);
    expect(fake.strikes[0]?.when).toBe(50);
  });
});
