import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('./#/zazen');
});

async function setPrepNone(page: import('@playwright/test').Page) {
  const prep = page.getByRole('button', { name: /Preparazione/ });
  while (!(await prep.textContent())?.includes('Nessuna')) await prep.click();
}

test('a 25-minute sitting starts dark and ends at 25 minutes', async ({ page }) => {
  await expect(page.locator('.stepper__number')).toHaveText('25');
  await setPrepNone(page);
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zazen');
  await expect(page.locator('.app')).toHaveClass(/night/);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  // No countdown by default.
  await expect(page.getByLabel('Tempo rimanente nel periodo')).toHaveCount(0);

  await page.clock.fastForward('24:58');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zazen');
  await page.clock.fastForward('00:03');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
  await expect(page.locator('.done-value')).toHaveText('25 min');

  await page.getByRole('button', { name: 'Chiudi' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zazen');
});

test('preparation, then zazen · kinhin · zazen with labels', async ({ page }) => {
  await page.getByRole('button', { name: 'Aggiungi kinhin e zazen' }).click();
  await page.getByRole('button', { name: '15', exact: true }).click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Preparazione');
  await page.clock.fastForward('00:11');
  await expect(heading).toHaveText('Zazen · 1 di 3');
  await page.clock.fastForward('15:00');
  await expect(heading).toHaveText('Kinhin · 2 di 3');
  await page.clock.fastForward('10:00');
  await expect(heading).toHaveText('Zazen · 3 di 3');
  await page.clock.fastForward('15:00');
  await expect(heading).toHaveText('Seduta conclusa');
});

test('pause stops time; ending early needs a second tap', async ({ page }) => {
  await setPrepNone(page);
  await page.getByRole('switch', { name: /Mostra tempo/ }).click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();

  const time = page.getByLabel('Tempo rimanente nel periodo');
  await page.clock.fastForward('05:00');
  await expect(time).toHaveText('20:00');

  await page.getByRole('button', { name: 'Pausa' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('In pausa');
  await page.clock.fastForward('10:00');
  await expect(time).toHaveText('20:00');
  await page.getByRole('button', { name: 'Riprendi' }).click();

  await page.getByRole('button', { name: 'Termina' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zazen');
  await page.getByRole('button', { name: 'Tocca ancora per terminare' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta interrotta');
  await expect(page.locator('.done-value')).toHaveText('5 min');
});

test('custom durations can be saved and removed', async ({ page }) => {
  await page.getByRole('button', { name: 'Un minuto in più' }).click();
  await page.getByRole('button', { name: 'Un minuto in più' }).click();
  await expect(page.locator('.stepper__number')).toHaveText('27');
  await page.getByRole('button', { name: 'Salva come durata' }).click();
  await expect(page.getByRole('button', { name: '27', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.locator('.stepper__number')).toHaveText('27');
  await page.getByRole('button', { name: 'Elimina questa durata' }).click();
  await expect(page.getByRole('button', { name: '27', exact: true })).toHaveCount(0);
});
