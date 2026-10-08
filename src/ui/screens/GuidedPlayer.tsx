import { useCallback, useEffect, useRef, useState } from 'react';
import { getEngine } from '../../audio/engine';
import { activity } from '../../pwa/activity';
import { createRecording, type Recording } from '../../sessions/recording';
import type { Guided } from '../../sessions/session';
import { speak, stopSpeech } from '../../sessions/speech';
import { keepScreenOn } from '../../timer/wakeLock';
import { PRACTICE_FADE_OUT, stopAmbient } from '../ambient';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatMinutes } from '../format';
import { closePractice } from '../practice';
import { t } from '../strings.it';

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
}: {
  guided: Guided;
  voice: boolean;
  ambient: boolean;
}) {
  const [snapshot, setSnapshot] = useState(() => guided.snapshot());
  const [confirming, setConfirming] = useState(false);
  const recording = useRef<Recording | undefined>(undefined);
  const spoken = useRef(-1);
  const { session } = guided;

  const refresh = useCallback(() => {
    setSnapshot(guided.snapshot());
  }, [guided]);

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

  useEffect(() => {
    if (snapshot.finished) return;
    const endActivity = activity.begin();
    const wakeLock = keepScreenOn();
    const id = window.setInterval(refresh, TICK_MS);
    const { ctx } = getEngine();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
      guided.resync();
      const snap = guided.snapshot();
      recording.current?.sync(snap.elapsed);
      setSnapshot(snap);
    };
    const onState = () => {
      if (ctx.state === 'running') guided.resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    ctx.addEventListener('statechange', onState);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      ctx.removeEventListener('statechange', onState);
      wakeLock.release();
      endActivity();
    };
  }, [guided, snapshot.finished, refresh]);

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
      <main className="night-screen night-screen--done">
        <ScreenTitle className="night-title">
          {snapshot.endedEarly ? t.guided.endedEarly : t.guided.finished}
        </ScreenTitle>
        <p className="night-label guided-done-title">{session.title}</p>
        <dl className="done-summary">
          <dt className="night-label">{t.sitting.duration}</dt>
          <dd className="done-value">{formatMinutes(snapshot.elapsed)}</dd>
        </dl>
        <div className="night-actions">
          <button type="button" className="btn glass glass--night" onClick={closePractice}>
            {t.sitting.close}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="night-screen">
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
