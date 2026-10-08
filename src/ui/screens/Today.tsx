import { useEffect, useState } from 'react';
import { ScreenTitle } from '../components/ScreenTitle';
import { SettingsIcon } from '../components/Icons';
import { TodayCard } from '../components/TodayCard';
import { formatLongDate, greetingFor } from '../format';
import { hrefFor } from '../router';
import { t } from '../strings.it';
import { useSettings } from '../useSettings';
import { mixLabel } from '../../audio/soundscapes/mix';
import { CATALOG, findSession } from '../../sessions/catalog';
import type { Route } from '../router';

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

function OtherPractice({ route, title, detail }: { route: Route; title: string; detail: string }) {
  return (
    <li>
      <a className="practice-row" href={hrefFor(route)}>
        <span>
          <span className="practice-row__title">{title}</span>
          <span className="practice-row__detail">{detail}</span>
        </span>
        <span className="practice-row__chevron" aria-hidden="true">
          ›
        </span>
      </a>
    </li>
  );
}

export function Today() {
  const now = useNow(MINUTE);
  const { breath, mix, guided } = useSettings();
  const lastGuided = findSession(guided.last) ?? CATALOG[0];
  const breathName = `${t.breath.name[breath.pattern]} · ${String(breath.minutes)} min`;
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
      <TodayCard now={now} />

      <h2 className="eyebrow section-label">{t.today.otherPractices}</h2>
      <ul className="rows">
        <OtherPractice route="breath" title={t.today.breathing} detail={breathName} />
        <OtherPractice
          route="guided"
          title={t.today.guided}
          detail={lastGuided ? `${lastGuided.title} · ${String(lastGuided.minutes)} min` : ''}
        />
        <OtherPractice
          route="soundscape"
          title={t.today.soundscape}
          detail={mixLabel(mix, t.soundscape.names, t.soundscape.silence)}
        />
      </ul>
    </main>
  );
}
