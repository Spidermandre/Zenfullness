import type { Cue } from '../timer/plan';
import {
  startTimedPractice,
  type PracticeDeps,
  type PracticeSnapshot,
  type PracticeState,
} from '../timer/practice';
import { instructionAt, type GuidedSession, type Instruction } from './format';

/** A guided meditation: one soft strike to open, timed instructions, one strike to close. */
export interface GuidedSnapshot extends PracticeSnapshot {
  /** Index of the instruction on screen, -1 before the first one. */
  index: number;
  instruction: Instruction | undefined;
}

export interface Guided {
  readonly session: GuidedSession;
  readonly total: number;
  state(): PracticeState;
  pause(): void;
  resume(): void;
  resync(): void;
  end(): void;
  snapshot(): GuidedSnapshot;
}

export function guidedCues(session: GuidedSession): Cue[] {
  const total = session.minutes * 60;
  return [
    { at: 0, instrument: 'bowl', gain: 0.7, reason: 'start' },
    { at: total, instrument: 'bowl', gain: 0.9, reason: 'end' },
  ];
}

export function startGuided(session: GuidedSession, deps: PracticeDeps): Guided {
  const total = session.minutes * 60;
  const practice = startTimedPractice(guidedCues(session), total, deps);
  return {
    session,
    total,
    state: () => practice.state(),
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
      const current = snap.finished ? undefined : instructionAt(session, snap.elapsed);
      return { ...snap, index: current?.index ?? -1, instruction: current?.instruction };
    },
  };
}
