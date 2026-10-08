import { useEffect, useState } from 'react';
import { isAudioRunning, onAudioState, resumeAudio } from '../audio/engine';
import { activity } from '../pwa/activity';
import { keepScreenOn } from '../timer/wakeLock';

/**
 * Everything a running practice needs while it is not finished:
 * - marks a practice in progress (app updates wait);
 * - keeps the screen on (re-acquired when the page is visible again);
 * - a display tick (timing never depends on it: state comes from absolute instants);
 * - when the page becomes visible again or the OS resumes audio, cues are rescheduled.
 * Returns whether the audio context is currently suspended by the OS.
 */
export function usePracticeLifecycle(
  practice: { resync(): void } | undefined,
  finished: boolean,
  refresh: () => void,
  tickMs = 1000,
): boolean {
  const [audioSuspended, setAudioSuspended] = useState(false);

  useEffect(() => {
    if (!practice || finished) return;
    const endActivity = activity.begin();
    const wakeLock = keepScreenOn();
    const id = window.setInterval(refresh, tickMs);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      resumeAudio();
      practice.resync();
      refresh();
    };
    const stopAudioWatch = onAudioState((running) => {
      setAudioSuspended(!running);
      if (running) practice.resync();
    });
    // After a restore the context stays suspended until a tap; check once it had time
    // to start normally, so the notice does not flash on an ordinary start.
    const check = window.setTimeout(() => {
      setAudioSuspended(!isAudioRunning());
    }, 1500);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(check);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      stopAudioWatch();
      wakeLock.release();
      endActivity();
    };
  }, [practice, finished, refresh, tickMs]);

  return audioSuspended;
}
