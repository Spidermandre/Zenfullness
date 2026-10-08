import { buildPlan, positionAt, type Plan, type Position, type SittingConfig } from './plan';
import { startTimedPractice, type PracticeDeps, type PracticeSnapshot } from './practice';

/** One sitting from start to finish: a timed practice plus the zazen/kinhin plan. */
export interface SittingSnapshot extends PracticeSnapshot {
  /** Seconds of actual practice: elapsed time minus the preparation. */
  practiced: number;
  position: Position;
}

export interface Sitting {
  readonly plan: Plan;
  pause(): void;
  resume(): void;
  resync(): void;
  end(): void;
  snapshot(): SittingSnapshot;
}

export type SittingDeps = PracticeDeps;

export function startSitting(config: SittingConfig, deps: SittingDeps): Sitting {
  const plan = buildPlan(config);
  const practice = startTimedPractice(plan.cues, plan.total, deps);
  const prep = plan.segments.find((s) => s.kind === 'prep')?.end ?? 0;

  return {
    plan,
    pause: () => {
      practice.pause();
    },
    resume: () => {
      practice.resume();
    },
    resync: () => {
      practice.resync();
    },
    end: () => {
      practice.end();
    },
    snapshot() {
      const snap = practice.snapshot();
      return {
        ...snap,
        practiced: Math.max(0, snap.elapsed - prep),
        position: snap.finished
          ? { segment: undefined, remaining: 0, done: true }
          : positionAt(plan, snap.elapsed),
      };
    },
  };
}
