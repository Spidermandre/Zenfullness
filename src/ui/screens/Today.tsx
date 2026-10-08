import { useEffect, useState } from 'react';
import { ScreenTitle } from '../components/ScreenTitle';
import { SettingsIcon } from '../components/Icons';
import { formatLongDate, greetingFor } from '../format';
import { hrefFor } from '../router';
import { t } from '../strings.it';

const MINUTE = 60_000;

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

export function Today() {
  const now = useNow(MINUTE);
  return (
    <main className="screen">
      <header className="today-header">
        <div>
          <p className="today-date">{formatLongDate(now)}</p>
          <ScreenTitle className="today-greeting">{greetingFor(now)}</ScreenTitle>
        </div>
        <a className="icon-btn glass" href={hrefFor('settings')} aria-label={t.settings.open}>
          <SettingsIcon />
        </a>
      </header>
      <p className="muted">{t.placeholder.comingSoon}</p>
    </main>
  );
}
