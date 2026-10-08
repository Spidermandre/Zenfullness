import { getEngine, setBusVolume, strike, unlockAudio } from '../../audio/engine';
import { CATALOG } from '../../sessions/catalog';
import type { GuidedSession } from '../../sessions/format';
import { startGuided } from '../../sessions/session';
import { isSpeechSupported, unlockSpeech } from '../../sessions/speech';
import { startAmbient } from '../ambient';
import { ScreenTitle } from '../components/ScreenTitle';
import { openPractice } from '../practice';
import { t } from '../strings.it';
import { getSettings, updateSettings, useSettings } from '../useSettings';

export function launchGuided(session: GuidedSession): void {
  // Everything below runs inside the tap: iOS allows audio and speech only from a gesture.
  unlockAudio();
  const settings = getSettings();
  const voice = settings.guided.voice && isSpeechSupported() && !session.audio;
  if (voice) unlockSpeech();
  if (settings.guided.ambient) startAmbient();
  setBusVolume('bells', settings.bellVolume);
  const { ctx } = getEngine();
  const guided = startGuided(session, {
    now: () => Date.now(),
    player: {
      now: () => ctx.currentTime,
      play: (cue, when) => strike(cue.instrument, when, Math.random, cue.gain),
    },
  });
  updateSettings((s) => ({ ...s, guided: { ...s.guided, last: session.id } }));
  openPractice({
    kind: 'guided',
    guided,
    voice,
    ambient: settings.guided.ambient,
    startedAt: Date.now(),
  });
}

/** Design 05: glass cards with title, duration and a play button. */
export function Guided() {
  const { guided } = useSettings();
  const speech = isSpeechSupported();
  return (
    <main className="screen">
      <ScreenTitle>{t.guided.title}</ScreenTitle>
      <ul className="guided-list">
        {CATALOG.map((session) => (
          <li key={session.id}>
            <button
              type="button"
              className="guided-card"
              aria-label={`${t.guided.start}: ${session.title}, ${String(session.minutes)} ${t.guided.minutes}`}
              onClick={() => {
                launchGuided(session);
              }}
            >
              <span>
                <span className="guided-card__title">{session.title}</span>
                <span className="guided-card__meta">
                  {session.minutes} {t.guided.minutes}
                  {session.audio ? ` · ${t.guided.recorded}` : ''}
                </span>
              </span>
              <span className="guided-card__play glass--primary" aria-hidden="true">
                ▶
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ul className="rows rows--settings">
        <li>
          <button
            type="button"
            role="switch"
            aria-checked={speech && guided.voice}
            disabled={!speech}
            className="row row--button"
            onClick={() => {
              updateSettings((s) => ({ ...s, guided: { ...s.guided, voice: !s.guided.voice } }));
            }}
          >
            <span>{t.guided.voice}</span>
            <span className="row__value">
              {!speech ? t.guided.voiceUnavailable : guided.voice ? t.zazen.yes : t.zazen.no}
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="switch"
            aria-checked={guided.ambient}
            className="row row--button"
            onClick={() => {
              updateSettings((s) => ({
                ...s,
                guided: { ...s.guided, ambient: !s.guided.ambient },
              }));
            }}
          >
            <span>{t.guided.ambient}</span>
            <span className="row__value">{guided.ambient ? t.zazen.yes : t.zazen.no}</span>
          </button>
        </li>
      </ul>
    </main>
  );
}
