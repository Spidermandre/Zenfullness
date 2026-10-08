import { useCallback, useEffect, useRef, useState } from 'react';
import { resumeAudio } from '../../audio/engine';
import { createRecording, type Recording } from '../../sessions/recording';
import type { Guided } from '../../sessions/session';
import { speak, stopSpeech } from '../../sessions/speech';
import { PRACTICE_FADE_OUT, stopAmbient } from '../ambient';
import { EndScreen } from '../components/EndScreen';
import { ScreenTitle } from '../components/ScreenTitle';
import { useRecordOnFinish } from '../record';
import { closePractice } from '../practice';
import { t } from '../strings.it';
import { usePracticeLifecycle } from '../usePracticeLifecycle';

const TICK_MS = 250;
const CONFIRM_MS = 4000;

/**
 * Guided session playback (added: not in the design; built like the sitting screen,
 * with the current instruction set in the display face at the centre).
 */
export function GuidedPlayer({
  guided,
  voice,
  ambient,
  startedAt,
}: {
  guided: Guided;
  voice: boolean;
  ambient: boolean;
  startedAt: number;
}) {
  const [snapshot, setSnapshot] = useState(() => guided.snapshot());
  const [confirming, setConfirming] = useState(false);
  const recording = useRef<Recording | undefined>(undefined);
  const spoken = useRef(-1);
  const { session } = guided;

  const refresh = useCallback(() => {
    setSnapshot(guided.snapshot());
  }, [guided]);

  const entryId = useRecordOnFinish(snapshot.finished, () => {
    const snap = guided.snapshot();
    return {
      kind: 'guided',
      startedAt,
      plannedSeconds: guided.total,
      actualSeconds: snap.elapsed,
      completed: !snap.endedEarly,
      detail: session.title,
    };
  });

  // A recorded session plays its audio instead of the synthetic voice.
  useEffect(() => {
    if (!session.audio) return;
    const rec = createRecording(`${import.meta.env.BASE_URL}${session.audio}`);
    recording.current = rec;
    rec.start();
    return () => {
      rec.stop();
      recording.current = undefined;
    };
  }, [session.audio]);

  // Speak each instruction once, when it appears.
  useEffect(() => {
    if (!voice || snapshot.paused || snapshot.index < 0 || snapshot.index === spoken.current)
      return;
    spoken.current = snapshot.index;
    if (snapshot.instruction) speak(snapshot.instruction.text);
  }, [voice, snapshot.index, snapshot.paused, snapshot.instruction]);

  useEffect(() => {
    if (!snapshot.finished) return;
    stopSpeech();
    recording.current?.stop();
    if (ambient) stopAmbient(PRACTICE_FADE_OUT);
  }, [snapshot.finished, ambient]);

  const audioSuspended = usePracticeLifecycle(guided, snapshot.finished, refresh, TICK_MS);

  // After the page was hidden, bring a recording back in line with the clock.
  useEffect(() => {
    if (snapshot.finished) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible')
        recording.current?.sync(guided.snapshot().elapsed);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [guided, snapshot.finished]);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => {
      setConfirming(false);
    }, CONFIRM_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [confirming]);

  const togglePause = () => {
    if (snapshot.paused) {
      guided.resume();
      recording.current?.resume(guided.snapshot().elapsed);
    } else {
      guided.pause();
      stopSpeech();
      recording.current?.pause();
    }
    refresh();
  };

  const end = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    guided.end();
    refresh();
  };

  if (snapshot.finished) {
    return (
      <EndScreen
        title={snapshot.endedEarly ? t.guided.endedEarly : t.guided.finished}
        subtitle={session.title}
        seconds={snapshot.elapsed}
        entryId={entryId}
        onClose={closePractice}
      />
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- the tap only revives audio; all controls are buttons
    <main className="night-screen" onClick={resumeAudio}>
      <ScreenTitle className="night-label night-label--top">
        {snapshot.paused ? t.sitting.paused : `${t.guided.label} · ${session.title}`}
      </ScreenTitle>
      <div className="session-glow" aria-hidden="true" />
      <div className="guided-text" aria-live="polite">
        {snapshot.instruction && (
          <p key={snapshot.index} className="guided-text__body">
            {snapshot.instruction.text}
          </p>
        )}
      </div>
      {audioSuspended && (
        <p className="night-notice" role="status">
          {t.sitting.audioBlocked}
        </p>
      )}
      <div className="night-actions">
        <button type="button" className="btn glass glass--night" onClick={togglePause}>
          {snapshot.paused ? t.sitting.resume : t.sitting.pause}
        </button>
        <button type="button" className="btn glass glass--night" onClick={end}>
          {confirming ? t.sitting.confirmEnd : t.sitting.end}
        </button>
      </div>
    </main>
  );
}
