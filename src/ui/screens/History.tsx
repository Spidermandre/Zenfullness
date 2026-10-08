import { useState } from 'react';
import { monthGrid, monthSummary, relativeDay } from '../../history/stats';
import type { LogEntry } from '../../storage/log';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatMinutes } from '../format';
import { useLog } from '../record';
import { t } from '../strings.it';

const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long' });
const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });

const capitalise = (s: string) => s.charAt(0).toLocaleUpperCase('it-IT') + s.slice(1);

function entryLabel(e: LogEntry): string {
  const kind = t.history.kind[e.kind];
  return e.kind === 'guided'
    ? `${kind} · ${e.detail}`
    : `${kind} · ${formatMinutes(e.actualSeconds)}`;
}

function whenLabel(e: LogEntry, now: Date): string {
  const r = relativeDay(e.startedAt, now);
  if (r === 'today') return t.history.today;
  if (r === 'yesterday') return t.history.yesterday;
  return shortDate.format(r).replace('.', '');
}

/** Design 06: two totals, the month calendar, recent practices. No ranking, no streaks. */
export function History() {
  const { entries, loaded } = useLog();
  const now = new Date();
  const [shown, setShown] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const summary = monthSummary(entries, shown.year, shown.month);
  const grid = monthGrid(shown.year, shown.month);
  const first = new Date(shown.year, shown.month, 1);
  const isCurrentMonth = shown.year === now.getFullYear() && shown.month === now.getMonth();

  const move = (delta: number) => {
    setShown((s) => {
      const d = new Date(s.year, s.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <main className="screen">
      <ScreenTitle>{t.history.title}</ScreenTitle>
      <p className="hint hint--lead">{t.help.history}</p>

      <div className="history-totals">
        <p>
          <span className="history-totals__value">{summary.sessions}</span>
          <span className="history-totals__label">{t.history.sessions(summary.sessions)}</span>
        </p>
        <p>
          <span className="history-totals__value">{formatMinutes(summary.seconds)}</span>
          <span className="history-totals__label">
            {t.history.inMonth(monthName.format(first))}
          </span>
        </p>
      </div>

      <section className="card history-calendar" aria-labelledby="history-month">
        <header className="history-calendar__header">
          <h2 id="history-month" className="history-calendar__title" aria-live="polite">
            {capitalise(monthYear.format(first))}
          </h2>
          <span className="history-calendar__nav">
            <button
              type="button"
              className="icon-btn"
              aria-label={t.history.previousMonth}
              onClick={() => {
                move(-1);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={t.history.nextMonth}
              disabled={isCurrentMonth}
              onClick={() => {
                move(1);
              }}
            >
              ›
            </button>
          </span>
        </header>
        <div className="history-grid__row" aria-hidden="true">
          {t.history.weekdays.map((d, i) => (
            <span key={t.history.weekdayNames[i]} className="history-grid__weekday">
              {d}
            </span>
          ))}
        </div>
        <ol className="history-grid__row history-grid__days" aria-labelledby="history-month">
          {grid.map((cell, i) => {
            if (!cell.day) return <li key={`blank-${String(i)}`} aria-hidden="true" />;
            const practised = summary.days.has(cell.day);
            const today = isCurrentMonth && cell.day === now.getDate();
            const date = new Date(shown.year, shown.month, cell.day);
            return (
              <li
                key={cell.day}
                className={`history-day${practised ? ' history-day--practised' : ''}${today ? ' history-day--today' : ''}`}
                aria-current={today ? 'date' : undefined}
              >
                <span aria-hidden="true">{cell.day}</span>
                <span className="visually-hidden">
                  {longDate.format(date)}
                  {practised ? `, ${t.history.practised}` : ''}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <h2 className="eyebrow section-label">{t.history.recent}</h2>
      {loaded && entries.length === 0 ? (
        <p className="muted">{t.history.empty}</p>
      ) : (
        <ul className="rows">
          {entries.slice(0, 8).map((e) => (
            <li key={e.id} className="row history-entry">
              <span>
                <span className="history-entry__label">{entryLabel(e)}</span>
                {e.note && <span className="history-entry__note">{e.note}</span>}
              </span>
              <span className="row__value">{whenLabel(e, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
