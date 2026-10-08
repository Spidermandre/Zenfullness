import { describe, expect, it } from 'vitest';
import { formatLongDate, greetingFor } from './format';

describe('formatLongDate', () => {
  it('formats like the design (weekday day month), capitalised', () => {
    expect(formatLongDate(new Date(2026, 9, 8))).toBe('Giovedì 8 ottobre');
  });
});

describe('greetingFor', () => {
  const at = (h: number) => new Date(2026, 9, 8, h, 0);
  it('greets by time of day', () => {
    expect(greetingFor(at(6))).toBe('Buongiorno');
    expect(greetingFor(at(12))).toBe('Buongiorno');
    expect(greetingFor(at(13))).toBe('Buon pomeriggio');
    expect(greetingFor(at(18))).toBe('Buonasera');
    expect(greetingFor(at(2))).toBe('Buonasera');
  });
});
