import { expect, test } from './fixtures';
import { seedLog } from './helpers';

async function openAt(page: import('@playwright/test').Page, when: Date) {
  await page.clock.install({ time: when });
  await page.goto('./');
  await page.clock.pauseAt(new Date(when.getTime() + 1000));
}

const card = (page: import('@playwright/test').Page) => page.locator('.today-card');

test('first time: 10 minutes of zazen, and the reason on request', async ({ page }) => {
  await openAt(page, new Date(2026, 9, 8, 7));
  await expect(card(page).locator('.today-card__title')).toHaveText('Zazen, 10 minuti');
  await expect(card(page)).toContainText('Si comincia con poco.');
  const why = page.getByRole('button', { name: 'Perché?' });
  await expect(why).toHaveAttribute('aria-expanded', 'false');
  await why.click();
  await expect(card(page)).toContainText('Non ci sono ancora sedute registrate');
  await expect(card(page).locator('.today-card__why')).toBeVisible();
  await page.getByRole('button', { name: 'Nascondi' }).click();
  await expect(card(page).locator('.today-card__why')).toBeHidden();
});

test('Inizia starts the proposed sitting; afterwards a different practice is proposed', async ({
  page,
}) => {
  await openAt(page, new Date(2026, 9, 8, 7));
  await card(page).getByRole('button', { name: 'Inizia' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preparazione');
  await page.clock.fastForward('10:12');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
  await expect(page.locator('.done-value')).toHaveText('10 min');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await expect(card(page).locator('.today-card__title')).toHaveText('Postura, 10 minuti');
  await expect(card(page)).toContainText('Oggi hai già fatto zazen');
});

test('a steady week lengthens the sitting by 5 minutes', async ({ page }) => {
  await openAt(page, new Date(2026, 9, 8, 7));
  await seedLog(page, [
    { day: 4, minutes: 10 },
    { day: 5, minutes: 10 },
    { day: 6, minutes: 10 },
    { day: 7, minutes: 10 },
  ]);
  await expect(card(page).locator('.today-card__title')).toHaveText('Zazen, 15 minuti');
  await expect(card(page)).toContainText('Si sale a 15 minuti');
});

test('after a pause the card stays neutral; the reason is only under Perché?', async ({ page }) => {
  await openAt(page, new Date(2026, 9, 12, 7));
  await seedLog(page, [
    { day: 4, minutes: 25 },
    { day: 5, minutes: 25 },
    { day: 6, minutes: 25 },
  ]);
  // 6 days since the last sitting: a short break, 25 → 20 minutes.
  await expect(card(page).locator('.today-card__title')).toHaveText('Zazen, 20 minuti');
  await expect(card(page).locator('.today-card__line')).toHaveText('Una seduta semplice.');
  await page.getByRole('button', { name: 'Perché?' }).click();
  await expect(card(page)).toContainText("L'ultima pratica è di 6 giorni fa");
});

test('late evening proposes a short breathing, which Inizia starts', async ({ page }) => {
  await openAt(page, new Date(2026, 9, 8, 22));
  await expect(card(page).locator('.today-card__title')).toHaveText('Respiro, 6 minuti');
  await card(page).getByRole('button', { name: 'Inizia' }).click();
  await expect(page.locator('.breath-subtitle')).toHaveText('Espirazione lunga · 4–6');
  await page.clock.fastForward(6 * 60_000 + 1000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respiro concluso');
});
