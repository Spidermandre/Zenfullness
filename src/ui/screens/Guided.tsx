import { CATALOG } from '../../sessions/catalog';
import { isSpeechSupported } from '../../sessions/speech';
import { launchGuided } from '../launch';
import { ScreenTitle } from '../components/ScreenTitle';
import { t } from '../strings.it';
import { updateSettings, useSettings } from '../useSettings';

/** Design 05: glass cards with title, duration and a play button. */
export function Guided() {
  const { guided } = useSettings();
  const speech = isSpeechSupported();
  return (
    <main className="screen">
      <ScreenTitle>{t.guided.title}</ScreenTitle>
      <p className="hint hint--lead">{t.help.guided}</p>
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
                {session.description && (
                  <span className="guided-card__description">{session.description}</span>
                )}
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
            aria-describedby="hint-voice"
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
          <p id="hint-voice" className="row-hint">
            {t.help.voice}
          </p>
        </li>
        <li>
          <button
            aria-describedby="hint-guided-ambient"
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
          <p id="hint-guided-ambient" className="row-hint">
            {t.help.ambient}
          </p>
        </li>
      </ul>
    </main>
  );
}
