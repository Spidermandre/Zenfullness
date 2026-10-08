import { describe, expect, it } from 'vitest';
import { hrefFor, parseRoute, ROUTES } from './router';

describe('parseRoute', () => {
  it('maps empty and root hashes to today', () => {
    expect(parseRoute('')).toBe('today');
    expect(parseRoute('#')).toBe('today');
    expect(parseRoute('#/')).toBe('today');
  });

  it('parses Italian paths', () => {
    expect(parseRoute('#/zazen')).toBe('zazen');
    expect(parseRoute('#/respiro')).toBe('breath');
    expect(parseRoute('#/guidate')).toBe('guided');
    expect(parseRoute('#/storico')).toBe('history');
    expect(parseRoute('#/impostazioni')).toBe('settings');
  });

  it('ignores trailing slashes, sub-paths and queries', () => {
    expect(parseRoute('#/zazen/')).toBe('zazen');
    expect(parseRoute('#/guidate/postura')).toBe('guided');
    expect(parseRoute('#/respiro?x=1')).toBe('breath');
  });

  it('falls back to today for unknown paths', () => {
    expect(parseRoute('#/nope')).toBe('today');
  });

  it('round-trips every route', () => {
    for (const route of ROUTES) expect(parseRoute(hrefFor(route))).toBe(route);
  });
});
