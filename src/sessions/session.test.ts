import { describe, expect, it } from 'vitest';
import type { CuePlayer } from '../timer/scheduler';
import { parseSession } from './format';
import { guidedCues, startGuided } from './session';
import { pickItalianVoice } from './voice';

const session = parseSession(
  'prova',
  '---\ntitle: Prova\nduration: 2\n---\n[00:05] Uno.\n[01:00] Due.\n',
);

describe('guided session', () => {
  it('opens and closes with a bell', () => {
    expect(guidedCues(session).map((c) => [c.at, c.reason])).toEqual([
      [0, 'start'],
      [120, 'end'],
    ]);
  });

  it('shows instructions by absolute time and ends at the duration', () => {
    let wall = 0;
    const player: CuePlayer = { now: () => wall / 1000, play: () => ({ cancel: () => undefined }) };
    const guided = startGuided(session, { now: () => wall, player });
    expect(guided.snapshot()).toMatchObject({ index: -1, instruction: undefined });
    wall = 6_000;
    expect(guided.snapshot().instruction?.text).toBe('Uno.');
    guided.pause();
    wall = 100_000;
    expect(guided.snapshot().instruction?.text).toBe('Uno.');
    guided.resume();
    wall = 160_000;
    expect(guided.snapshot().instruction?.text).toBe('Due.');
    wall = 220_000;
    expect(guided.snapshot()).toMatchObject({ finished: true, instruction: undefined });
  });
});

describe('pickItalianVoice', () => {
  const v = (name: string, lang: string, localService = true) => ({ name, lang, localService });

  it('prefers enhanced Italian voices', () => {
    const voices = [v('Samantha', 'en-US'), v('Alice', 'it-IT'), v('Federica (Premium)', 'it-IT')];
    expect(pickItalianVoice(voices)?.name).toBe('Federica (Premium)');
  });

  it('prefers on-device voices over network ones', () => {
    const voices = [v('Google italiano', 'it-IT', false), v('Luca', 'it-IT', true)];
    expect(pickItalianVoice(voices)?.name).toBe('Luca');
  });

  it('accepts other Italian locales and underscores', () => {
    expect(pickItalianVoice([v('X', 'it_CH')])?.name).toBe('X');
  });

  it('returns nothing without an Italian voice', () => {
    expect(pickItalianVoice([v('Samantha', 'en-US')])).toBeUndefined();
  });
});
