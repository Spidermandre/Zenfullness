import {
  elapsedSeconds,
  isPaused,
  pauseClock,
  resumeClock,
  startClock,
  type ClockState,
} from './clock';
import type { Cue } from './plan';
import { createCueScheduler, type CuePlayer } from './scheduler';

/**
 * A timed practice with sound cues (a sitting, a breathing session): absolute clock,
 * pause/resume, cues on the audio clock, early end. Framework-free: time and sound are
 * injected. The UI polls `snapshot()` and calls `resync()` whenever the page becomes
 * visible again or the audio context resumes after an interruption.
 */
export interface PracticeSnapshot {
  elapsed: number;
  paused: boolean;
  /** True once the planned end is reached or the user ended early. */
  finished: boolean;
  /** True when the user ended before the planned end. */
  endedEarly: boolean;
}

/** Everything needed to rebuild a practice after a reload (see ui/persist.ts). */
export interface PracticeState {
  clock: ClockState;
  endedAt: number | undefined;
}

export interface TimedPractice {
  readonly total: number;
  /** Serializable state, for restoring after the app was closed or reloaded. */
  state(): PracticeState;
  pause(): void;
  resume(): void;
  /** Reschedules pending cues from the absolute clock. */
  resync(): void;
  /** Ends now. Plays the closing cue (reason 'end') if ending before the planned end. */
  end(): void;
  snapshot(): PracticeSnapshot;
}

export interface PracticeDeps {
  /** Wall-clock milliseconds. */
  now(): number;
  player: CuePlayer;
  /** Resume from a saved state instead of starting now. */
  restore?: PracticeState;
  /** Called after start, pause, resume and end, with the new state (for persistence). */
  onChange?: (state: PracticeState) => void;
}

export function startTimedPractice(
  cues: readonly Cue[],
  total: number,
  deps: PracticeDeps,
): TimedPractice {
  const scheduler = createCueScheduler(cues, deps.player);
  let clock: ClockState = deps.restore?.clock ?? startClock(deps.now());
  let endedAt: number | undefined = deps.restore?.endedAt;

  const elapsed = () => Math.min(total, elapsedSeconds(clock, endedAt ?? deps.now()));
  const finished = () => endedAt !== undefined || elapsed() >= total;
  const changed = () => deps.onChange?.({ clock, endedAt });

  if (!finished() && !isPaused(clock)) scheduler.schedule(elapsed());
  changed();

  return {
    total,
    state: () => ({ clock, endedAt }),
    pause() {
      if (finished() || isPaused(clock)) return;
      clock = pauseClock(clock, deps.now());
      scheduler.cancel();
      changed();
    },
    resume() {
      if (finished() || !isPaused(clock)) return;
      clock = resumeClock(clock, deps.now());
      scheduler.schedule(elapsed());
      changed();
    },
    resync() {
      if (finished() || isPaused(clock)) return;
      scheduler.schedule(elapsed());
    },
    end() {
      if (endedAt !== undefined) return;
      const early = elapsed() < total;
      scheduler.cancel();
      endedAt = deps.now();
      if (early) {
        const closing = cues.find((c) => c.reason === 'end');
        if (closing) deps.player.play(closing, deps.player.now());
      }
      changed();
    },
    snapshot() {
      const e = elapsed();
      return {
        elapsed: e,
        paused: isPaused(clock),
        finished: finished(),
        endedEarly: endedAt !== undefined && e < total,
      };
    },
  };
}
