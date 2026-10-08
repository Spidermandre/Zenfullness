import { useCallback, useEffect, useState } from 'react';
import { getEngine, setBusVolume, strike } from '../../audio/engine';
import { activity } from '../../pwa/activity';
import type { SittingConfig } from '../../timer/plan';
import {
  startSitting,
  type Sitting as SittingModel,
  type SittingSnapshot,
} from '../../timer/session';
import { keepScreenOn } from '../../timer/wakeLock';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatClock, formatMinutes } from '../format';
import { closePractice } from '../practice';
import { t } from '../strings.it';
import { getSettings } from '../useSettings';

const TICK_MS = 1000;
const CONFIRM_MS = 4000;

function label(snapshot: SittingSnapshot, periodCount: number): string {
  if (snapshot.paused) return t.sitting.paused;
  const segment = snapshot.position.segment;
  if (!segment) return '';
  if (segment.kind === 'prep') return t.sitting.prep;
  const name = t.zazen.periodName[segment.kind];
  return periodCount > 1
    ? `${name} · ${String(segment.number)} ${t.sitting.of} ${String(periodCount)}`
    : name;
}

/** Starts a sitting with real time and real sound. Call from the user's tap. */
export function createSitting(config: SittingConfig): SittingModel {
  const { ctx } = getEngine();
  setBusVolume('bells', getSettings().bellVolume);
  return startSitting(config, {
    now: () => Date.now(),
    player: {
      now: () => ctx.currentTime,
      play: (cue, when) => strike(cue.instrument, when, Math.random, cue.gain),
    },
  });
}

export function Sitting({ config, sitting }: { config: SittingConfig; sitting: SittingModel }) {
  const [snapshot, setSnapshot] = useState(() => sitting.snapshot());
  const [confirming, setConfirming] = useState(false);
  const [audioSuspended, setAudioSuspended] = useState(false);

  const refresh = useCallback(() => {
    setSnapshot(sitting.snapshot());
  }, [sitting]);

  // Keep the screen on and mark a practice in progress until the sitting finishes.
  useEffect(() => {
    if (snapshot.finished) return;
    const endActivity = activity.begin();
    const wakeLock = keepScreenOn();
    return () => {
      wakeLock.release();
      endActivity();
    };
  }, [snapshot.finished]);

  // Display tick. Timing never depends on it: state is derived from absolute instants.
  useEffect(() => {
    const id = window.setInterval(refresh, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [refresh]);

  // Recover after the page was hidden or the audio context was interrupted (iOS).
  useEffect(() => {
    const { ctx } = getEngine();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
      sitting.resync();
      refresh();
    };
    const onState = () => {
      setAudioSuspended(ctx.state !== 'running');
      if (ctx.state === 'running') sitting.resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    ctx.addEventListener('statechange', onState);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      ctx.removeEventListener('statechange', onState);
    };
  }, [sitting, refresh]);

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
    if (snapshot.paused) sitting.resume();
    else sitting.pause();
    refresh();
  };

  const end = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    sitting.end();
    refresh();
  };

  /** Any tap is a user gesture: use it to revive a suspended audio context. */
  const wake = () => {
    const { ctx } = getEngine();
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
  };

  if (snapshot.finished) {
    return (
      <main className="night-screen night-screen--done">
        <ScreenTitle className="night-title">
          {snapshot.endedEarly ? t.sitting.doneEarly : t.sitting.doneTitle}
        </ScreenTitle>
        <dl className="done-summary">
          <dt className="night-label">{t.sitting.duration}</dt>
          <dd className="done-value">{formatMinutes(snapshot.practiced)}</dd>
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
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- the tap only revives audio; all controls are buttons
    <main className="night-screen" onClick={wake}>
      <ScreenTitle className="night-label night-label--top">
        {label(snapshot, sitting.plan.periodCount)}
      </ScreenTitle>
      <div className="session-glow" aria-hidden="true" />
      <div className="session-ring" aria-hidden="true" />
      {config.showTime && snapshot.position.segment && (
        <p className="session-time" aria-label={t.sitting.remaining}>
          {formatClock(snapshot.position.remaining)}
        </p>
      )}
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
