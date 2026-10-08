import { useCallback, useEffect, useRef, useState } from 'react';
import { getEngine, setBusVolume, strike, unlockAudio } from '../../audio/engine';
import {
  BUILT_IN,
  breathsPerMinute,
  clampPhases,
  PHASE_LIMITS,
  PHASE_ORDER,
  type PatternId,
  type PhaseKind,
  type Phases,
} from '../../breath/patterns';
import { startBreathing, type BreathConfig, type Breathing } from '../../breath/session';
import { activity } from '../../pwa/activity';
import { BREATH_MINUTES } from '../../storage/settings';
import { keepScreenOn } from '../../timer/wakeLock';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatMinutes } from '../format';
import { closePractice, openPractice } from '../practice';
import { t } from '../strings.it';
import { getSettings, updateSettings, useSettings } from '../useSettings';

const PATTERN_IDS: readonly PatternId[] = [
  'susokukan',
  'square',
  'long46',
  'long478',
  'coherence',
  'custom',
];

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function phasesFor(id: PatternId, custom: Phases): Phases {
  return BUILT_IN.find((p) => p.id === id)?.phases ?? custom;
}

function subtitle(id: PatternId, phases: Phases): string {
  const name = t.breath.name[id];
  if (id === 'susokukan') return `${name} · ${t.breath.countRange}`;
  if (id === 'coherence')
    return `${name} · ${String(Math.round(breathsPerMinute(phases)))} ${t.breath.perMinute}`;
  const parts = PHASE_ORDER.map((k) => phases[k]).filter((v, i) => v > 0 || i % 2 === 0);
  return `${name} · ${parts.join('–')}`;
}

function createBreathing(config: BreathConfig): Breathing {
  const { ctx } = getEngine();
  setBusVolume('bells', getSettings().bellVolume);
  return startBreathing(config, {
    now: () => Date.now(),
    player: {
      now: () => ctx.currentTime,
      play: (cue, when) => strike(cue.instrument, when, Math.random, cue.gain),
    },
  });
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      setReduced(query.matches);
    };
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, []);
  return reduced;
}

/** The glass sphere. Animated outside React (one rAF loop writing transform + text). */
function Pacer({ breathing, counting }: { breathing: Breathing | undefined; counting: boolean }) {
  const sphere = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = sphere.current;
    const text = label.current;
    if (!el || !text) return;
    const styles = getComputedStyle(el);
    const minScale = Number(styles.getPropertyValue('--sphere-min-scale')) || 0.55;
    const minOpacity = Number(styles.getPropertyValue('--sphere-min-opacity')) || 0.45;
    const settings = getSettings().breath;

    if (!breathing) {
      el.style.transform = `scale(${String(reduced ? 1 : minScale + (1 - minScale) * 0.5)})`;
      el.style.opacity = '1';
      text.textContent = t.breath.ready;
      return;
    }

    let frame = 0;
    let lastPhase: PhaseKind | undefined;
    let lastCycle = -1;
    const draw = () => {
      const { pacer, paused } = breathing.snapshot();
      const f = pacer.fullness;
      if (reduced) {
        el.style.transform = 'scale(1)';
        el.style.opacity = String(minOpacity + (1 - minOpacity) * f);
      } else {
        el.style.transform = `scale(${String(minScale + (1 - minScale) * f)})`;
        el.style.opacity = '1';
      }
      if (pacer.phase !== lastPhase || pacer.cycle !== lastCycle) {
        const word =
          counting && pacer.phase === 'exhale'
            ? (t.breath.counts[pacer.count - 1] ?? '')
            : t.breath.phase[pacer.phase];
        text.textContent = word;
        if (
          lastPhase !== undefined &&
          !paused &&
          settings.haptics &&
          canVibrate &&
          (pacer.phase === 'inhale' || pacer.phase === 'exhale')
        ) {
          navigator.vibrate(pacer.phase === 'inhale' ? 25 : [15, 60, 15]);
        }
        lastPhase = pacer.phase;
        lastCycle = pacer.cycle;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [breathing, counting, reduced]);

  return (
    <div className="pacer" aria-hidden="true">
      <div ref={sphere} className="pacer__sphere">
        <span ref={label} className="pacer__label" />
      </div>
    </div>
  );
}

function CustomEditor({ phases, onClose }: { phases: Phases; onClose: () => void }) {
  const set = (k: PhaseKind, delta: number) => {
    updateSettings((s) => ({
      ...s,
      breath: {
        ...s.breath,
        custom: clampPhases({ ...s.breath.custom, [k]: s.breath.custom[k] + delta }),
      },
    }));
  };
  return (
    <div className="breath-editor glass--night" role="group" aria-labelledby="breath-editor-title">
      <h2 id="breath-editor-title" className="night-label">
        {t.breath.editTitle}
      </h2>
      <ul className="rows">
        {PHASE_ORDER.map((k) => (
          <li key={k} className="row breath-editor__row">
            <span>{t.breath.phaseLong[k]}</span>
            <span className="breath-editor__stepper">
              <button
                type="button"
                className="icon-btn glass--night"
                aria-label={`${t.breath.phaseLong[k]}: ${t.breath.less}`}
                disabled={phases[k] <= PHASE_LIMITS[k].min}
                onClick={() => {
                  set(k, -1);
                }}
              >
                −
              </button>
              <output className="breath-editor__value" aria-live="polite">
                {phases[k]} {t.breath.seconds}
              </output>
              <button
                type="button"
                className="icon-btn glass--night"
                aria-label={`${t.breath.phaseLong[k]}: ${t.breath.more}`}
                disabled={phases[k] >= PHASE_LIMITS[k].max}
                onClick={() => {
                  set(k, 1);
                }}
              >
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn glass glass--breath" onClick={onClose}>
        {t.breath.done}
      </button>
    </div>
  );
}

export function Breath({
  practice,
}: {
  practice: { config: BreathConfig; breathing: Breathing } | undefined;
}) {
  const { breath } = useSettings();
  const [editing, setEditing] = useState(false);
  const breathing = practice?.breathing;
  const [snapshot, setSnapshot] = useState(() => breathing?.snapshot());
  const phases = practice?.config.phases ?? phasesFor(breath.pattern, breath.custom);
  const counting = practice?.config.counting ?? breath.pattern === 'susokukan';
  const running = practice !== undefined && snapshot?.finished !== true;

  const refresh = useCallback(() => {
    setSnapshot(breathing?.snapshot());
  }, [breathing]);

  // Wake lock + "practice in progress" while a session is open and not finished.
  useEffect(() => {
    if (!breathing || snapshot?.finished) return;
    const endActivity = activity.begin();
    const wakeLock = keepScreenOn();
    const id = window.setInterval(refresh, 1000);
    const { ctx } = getEngine();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
      breathing.resync();
      refresh();
    };
    const onState = () => {
      if (ctx.state === 'running') breathing.resync();
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
  }, [breathing, snapshot?.finished, refresh]);

  const choose = (id: PatternId) => {
    updateSettings((s) => ({ ...s, breath: { ...s.breath, pattern: id } }));
    setEditing(id === 'custom');
  };

  const start = () => {
    unlockAudio();
    const config: BreathConfig = {
      phases,
      counting,
      minutes: breath.minutes,
      sound: breath.sound,
    };
    setEditing(false);
    openPractice({ kind: 'breath', config, breathing: createBreathing(config) });
  };

  const togglePause = () => {
    if (!breathing) return;
    if (snapshot?.paused) breathing.resume();
    else breathing.pause();
    refresh();
  };

  const end = () => {
    breathing?.end();
    refresh();
  };

  if (practice && snapshot?.finished) {
    return (
      <main className="night-screen night-screen--done">
        <ScreenTitle className="night-title">
          {snapshot.endedEarly ? t.breath.endedEarly : t.breath.finished}
        </ScreenTitle>
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

  const patternId = breath.pattern;

  return (
    <main className={`breath-screen${running ? ' breath-screen--running' : ''}`}>
      <div className="breath-glow" aria-hidden="true" />
      <header className="breath-header">
        <ScreenTitle className="night-title">{t.breath.title}</ScreenTitle>
        <p className="breath-subtitle">{subtitle(patternId, phases)}</p>
      </header>

      <Pacer breathing={breathing} counting={counting} />

      {editing && !running && (
        <CustomEditor
          phases={breath.custom}
          onClose={() => {
            setEditing(false);
          }}
        />
      )}

      <div className="breath-controls" aria-hidden={running} inert={running}>
        <ul className="chips chips--night" aria-label={t.breath.patterns}>
          {PATTERN_IDS.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="chip chip--night"
                aria-pressed={patternId === id}
                onClick={() => {
                  choose(id);
                }}
              >
                {t.breath.chip[id]}
              </button>
            </li>
          ))}
        </ul>
        <ul className="chips chips--night chips--options">
          <li>
            <button
              type="button"
              className="chip chip--night"
              aria-label={`${t.breath.duration}: ${String(breath.minutes)} min`}
              onClick={() => {
                const i = BREATH_MINUTES.indexOf(breath.minutes);
                const minutes = BREATH_MINUTES[(i + 1) % BREATH_MINUTES.length] ?? 6;
                updateSettings((s) => ({ ...s, breath: { ...s.breath, minutes } }));
              }}
            >
              {breath.minutes} min
            </button>
          </li>
          <li>
            <button
              type="button"
              className="chip chip--night"
              aria-pressed={breath.sound}
              onClick={() => {
                updateSettings((s) => ({ ...s, breath: { ...s.breath, sound: !s.breath.sound } }));
              }}
            >
              {t.breath.sound}
            </button>
          </li>
          {canVibrate && (
            <li>
              <button
                type="button"
                className="chip chip--night"
                aria-pressed={breath.haptics}
                onClick={() => {
                  updateSettings((s) => ({
                    ...s,
                    breath: { ...s.breath, haptics: !s.breath.haptics },
                  }));
                }}
              >
                {t.breath.haptics}
              </button>
            </li>
          )}
          {patternId === 'custom' && !editing && (
            <li>
              <button
                type="button"
                className="chip chip--night"
                onClick={() => {
                  setEditing(true);
                }}
              >
                {t.breath.edit}
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className={`breath-actions${running ? ' breath-actions--running' : ''}`}>
        {!practice && (
          <button
            type="button"
            className="btn btn--lg btn--block glass glass--breath"
            onClick={start}
          >
            {t.breath.start}
          </button>
        )}
        {practice && (
          <>
            <button type="button" className="btn btn--lg glass glass--breath" onClick={togglePause}>
              {snapshot?.paused ? t.breath.resume : t.breath.pause}
            </button>
            {snapshot?.paused && (
              <button type="button" className="btn btn--lg glass glass--night" onClick={end}>
                {t.breath.end}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
