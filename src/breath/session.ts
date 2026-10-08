import { startTimedPractice, type PracticeDeps, type PracticeSnapshot } from '../timer/practice';
import type { Cue } from '../timer/plan';
import { pacerAt, phaseStarts, wholeBreaths, type PacerState, type Phases } from './patterns';

/** A guided breathing session: pacer + optional tones, closed by one soft bowl strike. */
export interface BreathConfig {
  phases: Phases;
  counting: boolean;
  minutes: number;
  sound: boolean;
  /** Play the ambient soundscape during the session. */
  ambient: boolean;
}

export interface BreathSnapshot extends PracticeSnapshot {
  pacer: PacerState;
}

export interface Breathing {
  readonly total: number;
  pause(): void;
  resume(): void;
  resync(): void;
  end(): void;
  snapshot(): BreathSnapshot;
}

export function breathCues(config: BreathConfig, total: number): Cue[] {
  const cues: Cue[] = [];
  if (config.sound) {
    for (const start of phaseStarts(config.phases, total)) {
      if (start.phase === 'inhale') {
        cues.push({ at: start.at, instrument: 'breathIn', gain: 1, reason: 'breath-in' });
      } else if (start.phase === 'exhale') {
        cues.push({ at: start.at, instrument: 'breathOut', gain: 1, reason: 'breath-out' });
      }
    }
  }
  cues.push({ at: total, instrument: 'bowl', gain: 0.6, reason: 'end' });
  return cues;
}

export function startBreathing(config: BreathConfig, deps: PracticeDeps): Breathing {
  const total = wholeBreaths(config.phases, config.minutes);
  const practice = startTimedPractice(breathCues(config, total), total, deps);
  return {
    total,
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
      return { ...snap, pacer: pacerAt(config.phases, snap.elapsed) };
    },
  };
}
