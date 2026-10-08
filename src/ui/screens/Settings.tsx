import { BackIcon } from '../components/Icons';
import { ScreenTitle } from '../components/ScreenTitle';
import { hrefFor } from '../router';
import { t } from '../strings.it';
import { useUpdateState, type OfflineState } from '../../pwa/update';

const OFFLINE_LABEL: Record<OfflineState, string> = {
  ready: t.settings.offlineReady,
  pending: t.settings.offlinePending,
  unsupported: t.settings.offlineUnsupported,
};

export function Settings() {
  const { offline } = useUpdateState();
  return (
    <main className="screen">
      <header className="settings-header">
        <a className="icon-btn glass" href={hrefFor('today')} aria-label={t.settings.back}>
          <BackIcon />
        </a>
        <ScreenTitle>{t.settings.title}</ScreenTitle>
      </header>
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
    </main>
  );
}
