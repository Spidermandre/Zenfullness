import { describe, expect, it } from 'vitest';
import { instructionAt, parseSession, parseTime, SessionFormatError } from './format';

const sample = `---
title: Prova
duration: 5   # minutes
order: 2
---
[00:05] Siediti.
Lascia andare.

Secondo paragrafo.
[1:30] Respira.
[04:59] Fine.
`;

describe('parseSession', () => {
  it('reads front matter and timed instructions', () => {
    const s = parseSession('prova', sample);
    expect(s).toMatchObject({
      id: 'prova',
      title: 'Prova',
      minutes: 5,
      order: 2,
      audio: undefined,
    });
    expect(s.instructions).toEqual([
      { at: 5, text: 'Siediti. Lascia andare.\n\nSecondo paragrafo.' },
      { at: 90, text: 'Respira.' },
      { at: 299, text: 'Fine.' },
    ]);
  });

  it('reads an optional one-line description', () => {
    const s = parseSession('d', sample.replace('order: 2', 'description: Per iniziare.'));
    expect(s.description).toBe('Per iniziare.');
  });

  it('accepts files saved with a byte-order mark', () => {
    expect(parseSession('bom', `\uFEFF${sample}`).title).toBe('Prova');
  });

  it('accepts an optional recording path', () => {
    const s = parseSession('a', sample.replace('order: 2', 'audio: /audio/prova.m4a'));
    expect(s.audio).toBe('audio/prova.m4a');
    expect(s.order).toBe(999);
  });

  it.each([
    ['no front matter', '[00:01] x', /front matter/],
    ['no title', sample.replace('title: Prova\n', ''), /title/],
    ['bad duration', sample.replace('duration: 5', 'duration: tanto'), /duration/],
    ['times out of order', sample.replace('[1:30]', '[00:03]'), /not after/],
    ['time past the end', sample.replace('[04:59]', '[05:00]'), /after the end/],
    ['text before first cue', sample.replace('[00:05] Siediti.', 'Siediti.'), /before the first/],
    ['empty instruction', sample.replace('[1:30] Respira.', '[1:30]'), /empty instruction/],
  ])('rejects %s with a clear message', (_, source, message) => {
    expect(() => parseSession('x', source)).toThrow(SessionFormatError);
    expect(() => parseSession('x', source)).toThrow(message);
  });
});

describe('parseTime', () => {
  it('parses mm:ss and h:mm:ss', () => {
    expect(parseTime('01:30')).toBe(90);
    expect(parseTime('1:02:03')).toBe(3723);
    expect(parseTime('a:00')).toBeNaN();
  });
});

describe('instructionAt', () => {
  const s = parseSession('prova', sample);
  it('shows nothing before the first instruction, then the latest started', () => {
    expect(instructionAt(s, 2)).toBeUndefined();
    expect(instructionAt(s, 5)?.index).toBe(0);
    expect(instructionAt(s, 200)?.index).toBe(1);
    expect(instructionAt(s, 299.5)?.instruction.text).toBe('Fine.');
  });
});
