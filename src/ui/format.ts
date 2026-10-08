import { t } from './strings.it';

const longDate = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "Giovedì 8 ottobre" */
export function formatLongDate(date: Date): string {
  const text = longDate.format(date);
  return text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1);
}

/** Time-of-day greeting: morning until 13:00, afternoon until 18:00, then evening. */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 13) return t.greeting.morning;
  if (hour >= 13 && hour < 18) return t.greeting.afternoon;
  return t.greeting.evening;
}

/** "25 min", "1 h 05" */
export function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

/** "4:05" — remaining time, rounded up so it reaches 0:00 exactly at the end. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
