import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards two design rules:
 *  1. colours and pixel sizes are written only in src/ui/tokens.css;
 *  2. text/background pairs used by the UI meet WCAG 2.2 AA (4.5:1).
 */
const SRC = join(import.meta.dirname, '..');
const TOKENS = join(SRC, 'ui', 'tokens.css');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('design tokens are the single source of literal values', () => {
  const files = walk(SRC).filter(
    (f) => /\.(css|tsx)$/.test(f) && f !== TOKENS && !f.endsWith('.test.ts'),
  );
  const forbidden = [/#[0-9a-fA-F]{3,8}\b/, /\brgba?\(/, /\bhsla?\(/, /\b\d+(\.\d+)?px\b/];

  it.each(files.map((f) => [relative(SRC, f), f]))('%s has no literal colours or px', (_, f) => {
    const source = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const pattern of forbidden) expect(source).not.toMatch(pattern);
  });
});

function token(name: string): string {
  const css = readFileSync(TOKENS, 'utf8');
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`token --${name} is not a 6-digit hex colour`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe('colour contrast (WCAG 2.2 AA, normal text 4.5:1)', () => {
  const pairs: [string, string][] = [
    ['ink', 'bg'],
    ['ink-body', 'bg'],
    ['ink-muted', 'bg'],
    ['ink-eyebrow', 'bg'],
    ['ink-tab-idle', 'bg'],
    ['accent', 'bg'],
    ['on-accent', 'accent-hi'],
    ['on-accent', 'accent'],
    ['night-ink', 'night-bg'],
    ['night-ink-soft', 'night-bg'],
    ['night-ink-muted', 'night-bg'],
    ['night-ink-faint', 'night-bg'],
    ['night-ink-muted', 'night-bg-breath'],
    ['night-chip-ink', 'night-bg-breath'],
    // Labels and eyebrows can sit on the blurred colour fields of the day screens.
    ['ink-label', 'bg-blob-sage'],
    ['ink-label', 'bg-blob-sand'],
    ['ink', 'bg-blob-sage'],
    ['ink-body', 'bg-blob-sage'],
  ];
  it.each(pairs)('--%s on --%s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
