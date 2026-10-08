import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { seedLog } from './helpers';

/** WCAG 2.2 A/AA audit of every screen (axe-core), in day and night themes. */
const T0 = new Date(2026, 9, 8, 7);

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact ?? ''}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

// The fake clock keeps running here: axe relies on timers and would hang on a paused one.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: T0 });
  await page.goto('./');
  await seedLog(page, [
    { day: 6, minutes: 20 },
    { day: 7, minutes: 6, kind: 'breath' },
  ]);
});

const screens: [string, string][] = [
  ['Oggi', './'],
  ['Zazen', './#/zazen'],
  ['Respiro', './#/respiro'],
  ['Guidate', './#/guidate'],
  ['Storico', './#/storico'],
  ['Impostazioni', './#/impostazioni'],
  ['Paesaggio sonoro', './#/paesaggio'],
];

for (const [name, url] of screens) {
  test(`${name} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await audit(page);
  });
}

test('Oggi with the Perché? panel open', async ({ page }) => {
  await page.getByRole('button', { name: 'Perché?' }).click();
  await audit(page);
});

test('sitting, end screen with note', async ({ page }) => {
  await page.goto('./#/zazen');
  await page.getByRole('switch', { name: /Mostra tempo/ }).click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();
  await page.clock.fastForward(20_000);
  await audit(page);
  await page.clock.fastForward('25:00');
  await expect(page.getByLabel('Nota')).toBeVisible();
  await audit(page);
});

test('breathing while running and the custom editor', async ({ page }) => {
  await page.goto('./#/respiro');
  await page.getByRole('button', { name: 'Personale' }).click();
  await audit(page);
  await page.getByRole('button', { name: 'Fatto' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  await page.clock.runFor(1000);
  await audit(page);
});

test('guided playback', async ({ page }) => {
  await page.goto('./#/guidate');
  await page.getByRole('button', { name: 'Inizia: Postura, 10 min' }).click();
  await page.clock.fastForward(6000);
  await audit(page);
});

test('reflow at 320 px: no horizontal scrolling on any screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const [, url] of screens) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});
