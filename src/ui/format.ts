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
