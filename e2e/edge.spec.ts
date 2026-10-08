import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const T0 = new Date('2026-10-08T07:00:00');

async function open(page: Page, url: string) {
  await page.clock.install({ time: T0 });
  await page.goto(url);
  await page.clock.pauseAt(new Date(T0.getTime() + 1000));
}

async function startSitting(page: Page) {
  const prep = page.getByRole('button', { name: /Preparazione/ });
  while (!(await prep.textContent())?.includes('Nessuna')) await prep.click();
  await page.getByRole('switch', { name: /Mostra tempo/ }).click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();
}

test('a sitting survives a reload and continues on the absolute clock', async ({ page }) => {
  await open(page, './#/zazen');
  await startSitting(page);
  await page.clock.fastForward('05:00');
  await expect(page.getByLabel('Tempo rimanente nel periodo')).toHaveText('20:00');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zazen');
  await page.clock.fastForward('01:00');
  await expect(page.getByLabel('Tempo rimanente nel periodo')).toHaveText('19:00');
  // Audio needs a tap after a reload (iOS rule): the screen says so.
  await page.clock.fastForward(2000);
  await expect(page.getByRole('status')).toContainText('Tocca lo schermo');

  await page.clock.fastForward('19:00');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zazen');
  await expect(page.getByRole('button', { name: 'Inizia la seduta' })).toBeVisible();
});

test('a sitting whose end passed long ago is not restored', async ({ page }) => {
  await open(page, './#/zazen');
  await startSitting(page);
  await page.clock.fastForward('02:00');
  await page.goto('about:blank');
  await page.clock.fastForward('01:00:00');
  await page.goto('./#/zazen');
  await expect(page.getByRole('button', { name: 'Inizia la seduta' })).toBeVisible();
});

test('a double tap on Inizia starts a single practice', async ({ page }) => {
  await open(page, './#/zazen');
  await page.getByRole('button', { name: '15', exact: true }).click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).dblclick();
  await page.clock.fastForward('16:00');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await page.getByRole('link', { name: 'Storico', exact: true }).click();
  await expect(page.locator('.history-entry')).toHaveCount(1);
});

test('without Web Audio, practices still run silently', async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate a browser without Web Audio.
    Reflect.deleteProperty(window, 'AudioContext');
    Reflect.deleteProperty(window, 'webkitAudioContext');
  });
  await open(page, './#/zazen');
  await page.getByRole('button', { name: /Campane/ }).click(); // preview strike: no-op
  await startSitting(page);
  await page.clock.fastForward('25:01');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await page.goto('./#/paesaggio');
  await page.getByRole('button', { name: 'Ascolta' }).click();
});
