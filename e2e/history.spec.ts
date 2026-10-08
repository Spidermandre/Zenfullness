import { expect, test } from './fixtures';

const T0 = new Date('2026-10-08T07:00:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: T0 });
  await page.goto('./#/storico');
  await page.clock.pauseAt(new Date(T0.getTime() + 1000));
});

test('an empty history is calm, with the month calendar', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 2, name: 'Ottobre 2026' })).toBeVisible();
  await expect(page.locator('.history-totals__value').first()).toHaveText('0');
  await expect(page.getByText('Nessuna pratica registrata, per ora.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mese successivo' })).toBeDisabled();
  await page.getByRole('button', { name: 'Mese precedente' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Settembre 2026' })).toBeVisible();
});

test('a finished sitting with a note appears in totals, calendar and recent list', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'Zazen', exact: true }).click();
  await page.getByRole('button', { name: '15', exact: true }).click();
  const prep = page.getByRole('button', { name: /Preparazione/ });
  while (!(await prep.textContent())?.includes('Nessuna')) await prep.click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();
  await page.clock.fastForward('15:01');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
  await page.getByLabel('Nota').fill('Gambe stanche, mente quieta.');
  await page.getByRole('button', { name: 'Chiudi' }).click();

  await page.getByRole('link', { name: 'Storico', exact: true }).click();
  await expect(page.locator('.history-totals__value')).toHaveText(['1', '15 min']);
  await expect(page.locator('.history-totals__label')).toHaveText(['seduta', 'in ottobre']);
  const practised = page.locator('.history-day--practised');
  await expect(practised).toHaveCount(1);
  await expect(practised.locator('.visually-hidden')).toHaveText('8 ottobre, pratica registrata');
  const recent = page.locator('.history-entry');
  await expect(recent).toHaveCount(1);
  await expect(recent).toContainText('Zazen · 15 min');
  await expect(recent).toContainText('Gambe stanche, mente quieta.');
  await expect(recent).toContainText('oggi');

  // Survives a reload (IndexedDB).
  await page.reload();
  await expect(page.locator('.history-entry')).toHaveCount(1);
});

test('practices shorter than a minute are not recorded', async ({ page }) => {
  await page.getByRole('link', { name: 'Respiro', exact: true }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  await page.clock.fastForward(30_000);
  await page.getByRole('button', { name: 'Pausa' }).click();
  await page.getByRole('button', { name: 'Termina' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respiro interrotto');
  await expect(page.getByLabel('Nota')).toHaveCount(0);
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await page.getByRole('link', { name: 'Storico', exact: true }).click();
  await expect(page.getByText('Nessuna pratica registrata, per ora.')).toBeVisible();
});

test('a guided session is listed by title', async ({ page }) => {
  await page.getByRole('link', { name: 'Guidate', exact: true }).click();
  await page.getByRole('button', { name: 'Inizia: Postura, 10 min' }).click();
  await page.clock.fastForward('10:01');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meditazione conclusa');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await page.getByRole('link', { name: 'Storico', exact: true }).click();
  await expect(page.locator('.history-entry')).toContainText('Guidata · Postura');
});
