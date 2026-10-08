import {
  elapsedSeconds,
  isPaused,
  pauseClock,
  resumeClock,
  startClock,
  type ClockState,
} from './clock';
import { buildPlan, positionAt, type Plan, type Position, type SittingConfig } from './plan';
import { createCueScheduler, type CuePlayer } from './scheduler';

/**
 * One sitting from start to finish. Framework-free: time and sound are injected.
 * The UI polls `snapshot()` (cheaply, e.g. once a second) and calls `resync()` whenever
 * the page becomes visible again or the audio context resumes after an interruption.
 */
export interface SittingSnapshot {
  elapsed: number;
  /** Seconds of actual practice: elapsed time minus the preparation. */
  practiced: number;
  position: Position;
  paused: boolean;
  /** True once the planned end is reached or the user ended early. */
  finished: boolean;
  /** True when the user ended before the planned end. */
  endedEarly: boolean;
}

export interface Sitting {
  readonly plan: Plan;
  pause(): void;
  resume(): void;
  /** Reschedules pending cues from the absolute clock. */
  resync(): void;
  /** Ends now. Rings the closing strike if ending before the planned end. */
  end(): void;
  snapshot(): SittingSnapshot;
}

export interface SittingDeps {
  /** Wall-clock milliseconds. */
  now(): number;
  player: CuePlayer;
}

export function startSitting(config: SittingConfig, deps: SittingDeps): Sitting {
  const plan = buildPlan(config);
  const scheduler = createCueScheduler(plan.cues, deps.player);
  let clock: ClockState = startClock(deps.now());
  let endedAt: number | undefined;
  scheduler.schedule(0);

  const elapsed = () => Math.min(plan.total, elapsedSeconds(clock, endedAt ?? deps.now()));
  const finished = () => endedAt !== undefined || elapsed() >= plan.total;

  return {
    plan,
    pause() {
      if (finished() || isPaused(clock)) return;
      clock = pauseClock(clock, deps.now());
      scheduler.cancel();
    },
    resume() {
      if (finished() || !isPaused(clock)) return;
      clock = resumeClock(clock, deps.now());
      scheduler.schedule(elapsed());
    },
    resync() {
      if (finished() || isPaused(clock)) return;
      scheduler.schedule(elapsed());
    },
    end() {
      if (endedAt !== undefined) return;
      const early = elapsed() < plan.total;
      scheduler.cancel();
      endedAt = deps.now();
      if (early) {
        const closing = plan.cues.find((c) => c.reason === 'end');
        if (closing) deps.player.play(closing, deps.player.now());
      }
    },
    snapshot() {
      const e = elapsed();
      const isFinished = finished();
      const prep = plan.segments.find((seg) => seg.kind === 'prep')?.end ?? 0;
      return {
        elapsed: e,
        practiced: Math.max(0, e - prep),
        position: isFinished
          ? { segment: undefined, remaining: 0, done: true }
          : positionAt(plan, e),
        paused: isPaused(clock),
        finished: isFinished,
        endedEarly: endedAt !== undefined && e < plan.total,
      };
    },
  };
}
