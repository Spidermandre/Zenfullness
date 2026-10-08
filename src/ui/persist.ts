import type { BreathConfig } from '../breath/session';
import type { SittingConfig } from '../timer/plan';
import type { PracticeState } from '../timer/practice';

/**
 * The practice in progress, saved on every state change (start, pause, resume, end) so
 * it survives a reload or iOS closing the app in the background. It is cleared when the
 * practice is recorded or closed. On launch, `ui/launch.ts#restorePractice` rebuilds it
 * from the absolute clock.
 */
export type ActivePractice =
  | { kind: 'sitting'; startedAt: number; config: SittingConfig; state: PracticeState }
  | {
      kind: 'breath';
      startedAt: number;
      config: BreathConfig;
      detail: string;
      state: PracticeState;
    }
  | {
      kind: 'guided';
      startedAt: number;
      sessionId: string;
      voice: boolean;
      ambient: boolean;
      state: PracticeState;
    };

const KEY = 'zenfullness.active';

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function saveActive(active: ActivePractice): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(active));
  } catch {
    // Storage full or disabled: the practice simply cannot be restored after a reload.
  }
}

export function clearActive(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export function loadActive(): ActivePractice | undefined {
  try {
    const text = storage()?.getItem(KEY);
    if (!text) return undefined;
    const value = JSON.parse(text) as Partial<ActivePractice>;
    const clock = value.state?.clock;
    if (
      (value.kind !== 'sitting' && value.kind !== 'breath' && value.kind !== 'guided') ||
      typeof value.startedAt !== 'number' ||
      !clock ||
      typeof clock.startedAt !== 'number' ||
      typeof clock.pausedTotal !== 'number'
    ) {
      clearActive();
      return undefined;
    }
    return value as ActivePractice;
  } catch {
    clearActive();
    return undefined;
  }
}

/** A practice whose planned end passed longer ago than this is not restored. */
export const RESTORE_GRACE_MS = 10 * 60_000;
/** A practice left paused longer than this is not restored. */
export const RESTORE_PAUSED_MAX_MS = 12 * 3_600_000;

/** Whether a saved practice is still worth restoring at `now`. Pure. */
export function shouldRestore(state: PracticeState, totalSeconds: number, now: number): boolean {
  const { clock, endedAt } = state;
  if (endedAt !== undefined) return false;
  if (clock.pausedAt !== undefined) return now - clock.pausedAt < RESTORE_PAUSED_MAX_MS;
  const plannedEnd = clock.startedAt + clock.pausedTotal + totalSeconds * 1000;
  return now - plannedEnd < RESTORE_GRACE_MS;
}
