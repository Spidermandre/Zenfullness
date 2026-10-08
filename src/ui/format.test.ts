import { describe, expect, it } from 'vitest';
import { formatClock, formatLongDate, formatMinutes, greetingFor } from './format';

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

describe('formatMinutes', () => {
  it('formats durations', () => {
    expect(formatMinutes(1500)).toBe('25 min');
    expect(formatMinutes(29)).toBe('0 min');
    expect(formatMinutes(3900)).toBe('1 h 05');
  });
});

describe('formatClock', () => {
  it('rounds up and never goes below zero', () => {
    expect(formatClock(245)).toBe('4:05');
    expect(formatClock(0.2)).toBe('0:01');
    expect(formatClock(-3)).toBe('0:00');
  });
});
