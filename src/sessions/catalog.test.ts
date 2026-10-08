import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG, loadCatalog } from './catalog';
import { parseSession } from './format';

const DIR = join(import.meta.dirname, 'content');
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));

describe('content files', () => {
  it.each(files)('%s is a valid guided session', (file) => {
    expect(() => parseSession(file, readFileSync(join(DIR, file), 'utf8'))).not.toThrow();
  });

  it('every file is in the catalog, in order', () => {
    expect(CATALOG).toHaveLength(files.length);
    expect(CATALOG.map((s) => s.title)).toEqual([
      'Postura',
      'Consapevolezza del respiro',
      'Scansione del corpo',
      'Shikantaza',
      'Suoni',
      'Benevolenza',
    ]);
  });

  it('every built-in session has a one-line description for newcomers', () => {
    for (const s of CATALOG) expect(s.description?.length).toBeGreaterThan(10);
  });

  it('matches the durations in the design', () => {
    expect(CATALOG.map((s) => s.minutes)).toEqual([10, 15, 20, 25, 15, 15]);
  });

  it('leaves room for silence: no instruction in the last 20 s before the bell', () => {
    for (const s of CATALOG) {
      const last = s.instructions.at(-1);
      expect(last && s.minutes * 60 - last.at).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('loadCatalog', () => {
  it('skips a malformed file instead of failing', () => {
    const sessions = loadCatalog({
      './content/ok.md': '---\ntitle: Ok\nduration: 1\n---\n[00:01] ciao',
      './content/broken.md': 'no front matter',
    });
    expect(sessions.map((s) => s.id)).toEqual(['ok']);
  });
});
