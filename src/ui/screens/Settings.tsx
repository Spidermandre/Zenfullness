import { BackIcon } from '../components/Icons';
import { ScreenTitle } from '../components/ScreenTitle';
import { hrefFor } from '../router';
import { t } from '../strings.it';
import { useUpdateState, type OfflineState } from '../../pwa/update';
import { setBusVolume, strikeNow } from '../../audio/engine';
import { updateSettings, useSettings } from '../useSettings';

const OFFLINE_LABEL: Record<OfflineState, string> = {
  ready: t.settings.offlineReady,
  pending: t.settings.offlinePending,
  unsupported: t.settings.offlineUnsupported,
};

export function Settings() {
  const { offline } = useUpdateState();
  const { bellVolume, ambientVolume } = useSettings();

  const setBellVolume = (value: number) => {
    updateSettings((s) => ({ ...s, bellVolume: value }));
    setBusVolume('bells', value);
  };

  const testBell = () => {
    setBusVolume('bells', bellVolume);
    strikeNow('bowl');
  };
  return (
    <main className="screen">
      <header className="settings-header">
        <a className="icon-btn glass" href={hrefFor('today')} aria-label={t.settings.back}>
          <BackIcon />
        </a>
        <ScreenTitle>{t.settings.title}</ScreenTitle>
      </header>
      <div className="row">
        <label htmlFor="bell-volume">{t.settings.bellVolume}</label>
        <input
          id="bell-volume"
          className="slider"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(bellVolume * 100)}
          onChange={(e) => {
            setBellVolume(Number(e.currentTarget.value) / 100);
          }}
        />
        <button
          type="button"
          className="btn btn--small glass"
          aria-label={t.settings.testBellLabel}
          onClick={testBell}
        >
          {t.settings.testBell}
        </button>
      </div>
      <div className="row">
        <label htmlFor="ambient-volume-settings">{t.settings.ambientVolume}</label>
        <input
          id="ambient-volume-settings"
          className="slider"
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
      <p className="hint">{t.help.settingsVolumes}</p>
      <dl className="rows">
        <div className="row">
          <dt>{t.settings.offline}</dt>
          <dd className="row__value" data-testid="offline-state">
            {OFFLINE_LABEL[offline]}
          </dd>
        </div>
        <div className="row">
          <dt>{t.settings.version}</dt>
          <dd className="row__value">{__APP_VERSION__}</dd>
        </div>
      </dl>
      <p className="hint">{t.help.settingsOffline}</p>
    </main>
  );
}
