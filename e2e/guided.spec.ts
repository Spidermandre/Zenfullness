import { expect, test } from './fixtures';

const T0 = new Date('2026-10-08T07:00:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: T0 });
  await page.goto('./#/guidate');
  await page.clock.pauseAt(new Date(T0.getTime() + 1000));
});

test('lists the six sessions of the design', async ({ page }) => {
  const cards = page.locator('.guided-card__title');
  await expect(cards).toHaveText([
    'Postura',
    'Consapevolezza del respiro',
    'Scansione del corpo',
    'Shikantaza',
    'Suoni',
    'Benevolenza',
  ]);
  await expect(page.getByRole('button', { name: 'Inizia: Shikantaza, 25 min' })).toBeVisible();
});

test('a guided session shows its instructions on time and ends with the bell', async ({ page }) => {
  await page.getByRole('button', { name: 'Inizia: Postura, 10 min' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Guidata · Postura');
  await expect(page.locator('.guided-text__body')).toHaveCount(0);

  await page.clock.fastForward(5_000);
  await expect(page.locator('.guided-text__body')).toContainText('Siediti sul cuscino');
  await page.clock.fastForward(40_000);
  await expect(page.locator('.guided-text__body')).toContainText('Il bacino');

  await page.getByRole('button', { name: 'Pausa' }).click();
  await page.clock.fastForward(120_000);
  await expect(page.locator('.guided-text__body')).toContainText('Il bacino');
  await page.getByRole('button', { name: 'Riprendi' }).click();

  await page.clock.fastForward('09:20');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meditazione conclusa');
  await expect(page.locator('.done-value')).toHaveText('10 min');
  await page.getByRole('button', { name: 'Chiudi' }).click();

  await page.getByRole('link', { name: 'Oggi', exact: true }).click();
  await expect(page.getByRole('link', { name: /Guidata/ })).toContainText('Postura · 10 min');
});

test('voice can be turned off and the choice is kept', async ({ page }) => {
  const voice = page.getByRole('switch', { name: /Lettura ad alta voce/ });
  await expect(voice).toHaveAttribute('aria-checked', 'true');
  await voice.click();
  await expect(voice).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(voice).toHaveAttribute('aria-checked', 'false');
});
