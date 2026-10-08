import { useEffect, useState } from 'react';
import { getSoundscape, setBusVolume, unlockAudio } from '../../audio/engine';
import { LAYER_IDS, mixLabel } from '../../audio/soundscapes/mix';
import { activity } from '../../pwa/activity';
import { startAmbient, stopAmbient } from '../ambient';
import { BackIcon } from '../components/Icons';
import { ScreenTitle } from '../components/ScreenTitle';
import { hrefFor } from '../router';
import { t } from '../strings.it';
import { updateSettings, useSettings } from '../useSettings';

/**
 * Soundscape mixer (added: not in the design; built from the Respiro night screen,
 * night glass rows and the existing slider). Changes apply live while playing.
 */
export function Soundscape() {
  const { mix, ambientVolume } = useSettings();
  const [playing, setPlaying] = useState(() => getSoundscape().isPlaying());

  // Listening counts as a practice: an app update must not cut the sound.
  useEffect(() => {
    if (!playing) return;
    return activity.begin();
  }, [playing]);

  const apply = () => {
    if (getSoundscape().isPlaying()) startAmbient(1.5);
  };

  const toggle = () => {
    if (playing) {
      stopAmbient();
      setPlaying(false);
    } else {
      unlockAudio();
      startAmbient();
      setPlaying(true);
    }
  };

  return (
    <main className="breath-screen soundscape-screen">
      <div className="breath-glow" aria-hidden="true" />
      <header className="settings-header soundscape-header">
        <a className="icon-btn glass--night" href={hrefFor('today')} aria-label={t.soundscape.back}>
          <BackIcon />
        </a>
        <div>
          <ScreenTitle className="night-title">{t.soundscape.title}</ScreenTitle>
          <p className="breath-subtitle">
            {mixLabel(mix, t.soundscape.names, t.soundscape.silence)}
          </p>
        </div>
      </header>

      <h2 className="night-label soundscape-label">{t.soundscape.layers}</h2>
      <ul className="rows soundscape-layers">
        {LAYER_IDS.map((id) => (
          <li key={id} className="soundscape-layer">
            <button
              type="button"
              role="switch"
              aria-checked={mix[id].on}
              className="row row--button soundscape-layer__toggle"
              onClick={() => {
                updateSettings((s) => ({
                  ...s,
                  mix: { ...s.mix, [id]: { ...s.mix[id], on: !s.mix[id].on } },
                }));
                apply();
              }}
            >
              <span>{t.soundscape.names[id]}</span>
              <span className="row__value">{mix[id].on ? t.zazen.yes : t.zazen.no}</span>
            </button>
            <input
              className="slider slider--night"
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={!mix[id].on}
              aria-label={`${t.soundscape.level} ${t.soundscape.names[id].toLowerCase()}`}
              value={Math.round(mix[id].level * 100)}
              onChange={(e) => {
                const level = Number(e.currentTarget.value) / 100;
                updateSettings((s) => ({ ...s, mix: { ...s.mix, [id]: { ...s.mix[id], level } } }));
                apply();
              }}
            />
          </li>
        ))}
      </ul>

      <div className="row soundscape-volume">
        <label htmlFor="ambient-volume">{t.soundscape.volume}</label>
        <input
          id="ambient-volume"
          className="slider slider--night"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(ambientVolume * 100)}
          onChange={(e) => {
            const volume = Number(e.currentTarget.value) / 100;
            updateSettings((s) => ({ ...s, ambientVolume: volume }));
            setBusVolume('ambient', volume);
          }}
        />
      </div>

      <p className="soundscape-note">{t.soundscape.note}</p>

      <div className="breath-actions">
        <button
          type="button"
          className="btn btn--lg btn--block glass glass--breath"
          aria-pressed={playing}
          onClick={toggle}
        >
          {playing ? t.soundscape.stop : t.soundscape.listen}
        </button>
      </div>
    </main>
  );
}
