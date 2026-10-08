import { useId, useState } from 'react';
import { BUILT_IN } from '../../breath/patterns';
import { suggest, type Suggestion } from '../../path/rules';
import { CATALOG, findSession } from '../../sessions/catalog';
import { launchBreath, launchGuided, launchSitting } from '../launch';
import { useLog } from '../record';
import { subtitle } from '../screens/Breath';
import { t } from '../strings.it';
import { getSettings } from '../useSettings';

function title(s: Suggestion): string {
  switch (s.kind) {
    case 'zazen':
      return t.path.zazenTitle(s.minutes);
    case 'breath':
      return t.path.breathTitle(s.minutes);
    case 'guided':
      return t.path.guidedTitle(s.session.title, s.session.minutes);
  }
}

function start(s: Suggestion): void {
  const settings = getSettings();
  switch (s.kind) {
    case 'zazen':
      launchSitting({ ...settings.sitting, periods: [{ kind: 'zazen', minutes: s.minutes }] });
      return;
    case 'breath': {
      const pattern = BUILT_IN.find((p) => p.id === s.pattern);
      if (!pattern) return;
      launchBreath(
        {
          phases: pattern.phases,
          counting: pattern.counting,
          minutes: s.minutes,
          sound: settings.breath.sound,
          ambient: settings.breath.ambient,
        },
        subtitle(s.pattern, pattern.phases),
      );
      return;
    }
    case 'guided': {
      const session = findSession(s.session.id);
      if (session) launchGuided(session);
    }
  }
}

/**
 * Design 01 "Pratica di oggi": the adaptive proposal, Inizia, and Perché? which reveals
 * the rule that produced it (added: inline disclosure instead of a separate screen).
 */
export function TodayCard({ now }: { now: Date }) {
  const { entries, loaded } = useLog();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!loaded) return <div className="card today-card today-card--loading" aria-hidden="true" />;

  const proposal = suggest(entries, now, CATALOG);
  const main = proposal.reasons[0];

  return (
    <section className="card today-card" aria-labelledby="today-card-title">
      <p className="today-card__eyebrow">{t.path.eyebrow}</p>
      <h2 id="today-card-title" className="today-card__title">
        {title(proposal)}
      </h2>
      {main && <p className="today-card__line">{t.path.card[main.code](main.values)}</p>}
      <div className="today-card__actions">
        <button
          type="button"
          className="btn btn--grow glass glass--primary"
          onClick={() => {
            start(proposal);
          }}
        >
          {t.path.start}
        </button>
        <button
          type="button"
          className="btn glass"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((o) => !o);
          }}
        >
          {open ? t.path.hideWhy : t.path.why}
        </button>
      </div>
      <div id={panelId} className="today-card__why" hidden={!open}>
        <h3 className="visually-hidden">{t.path.whyTitle}</h3>
        <ul>
          {proposal.reasons.map((r) => (
            <li key={r.code}>{t.path.reasons[r.code](r.values)}</li>
          ))}
        </ul>
        <p className="today-card__footnote">{t.path.footnote}</p>
      </div>
    </section>
  );
}
