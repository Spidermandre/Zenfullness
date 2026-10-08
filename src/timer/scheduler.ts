import type { Cue } from './plan';

/**
 * Schedules sound cues on an audio clock (AudioContext.currentTime in the app).
 *
 * Cues are handed to the audio thread ahead of time, so they ring at the exact instant
 * even if the JavaScript main thread is throttled. The mapping between session time and
 * audio time is computed at scheduling time from the absolute session clock:
 *
 *   audioTime(cue) = audioNow + (cue.at − elapsedNow)
 *
 * On pause every strike that has not begun is cancelled (one already ringing decays
 * naturally and is never repeated); on resume (or after the audio context was
 * interrupted, e.g. by a phone call on iOS) the remaining cues are scheduled again.
 */
export interface StrikeHandle {
  cancel(): void;
}

export interface CuePlayer {
  /** Current time of the audio clock, in seconds. */
  now(): number;
  /** Plays the cue at audio time `when` (seconds). */
  play(cue: Cue, when: number): StrikeHandle;
}

/** A cue this late (seconds) is skipped instead of being played out of time. */
export const LATE_TOLERANCE = 0.5;

export interface CueScheduler {
  /** (Re)schedules every cue not yet played, given the session's elapsed seconds now. */
  schedule(elapsed: number): void;
  /** Cancels every pending strike. */
  cancel(): void;
  /** Cues handed to the player and not cancelled, for diagnostics and tests. */
  pending(): readonly Cue[];
}

export function createCueScheduler(cues: readonly Cue[], player: CuePlayer): CueScheduler {
  let handles: { cue: Cue; when: number; handle: StrikeHandle }[] = [];
  // Cues whose strike already began; never played twice across pause/resume.
  const played = new Set<Cue>();

  const cancel = () => {
    const audioNow = player.now();
    for (const { cue, when, handle } of handles) {
      if (when <= audioNow) played.add(cue);
      else handle.cancel();
    }
    handles = [];
  };

  return {
    schedule(elapsed) {
      cancel();
      const audioNow = player.now();
      for (const cue of cues) {
        if (played.has(cue)) continue;
        const delay = cue.at - elapsed;
        if (delay < -LATE_TOLERANCE) continue;
        const when = audioNow + Math.max(0, delay);
        handles.push({ cue, when, handle: player.play(cue, when) });
      }
    },
    cancel,
    pending: () => handles.map((h) => h.cue),
  };
}
