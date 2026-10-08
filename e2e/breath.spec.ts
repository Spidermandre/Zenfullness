import { expect, test } from './fixtures';

const T0 = new Date('2026-10-08T07:00:00');

// Time is frozen after load and only moves when the test says so: with a running clock
// a slow CI machine adds real seconds between steps and breath boundaries drift.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: T0 });
  await page.goto('./#/respiro');
  await page.clock.pauseAt(new Date(T0.getTime() + 1000));
});

const word = (page: import('@playwright/test').Page) => page.locator('.pacer__label');

/**
 * Jumps the fake clock, then lets a few animation frames run at the new time.
 * fastForward fires a pending requestAnimationFrame at most once, possibly at an
 * intermediate instant, so the pacer label must be redrawn before it is checked.
 */
async function jump(page: import('@playwright/test').Page, ms: number) {
  await page.clock.fastForward(ms);
  await page.clock.runFor(100);
}

test('a 4–6 session: words follow the breath, chips hide, ends after whole breaths', async ({
  page,
}) => {
  await page.getByRole('button', { name: '4–6' }).click();
  await expect(page.locator('.breath-subtitle')).toHaveText('Espirazione lunga · 4–6');
  await page.getByRole('button', { name: /^Durata/ }).click(); // 6 → 10
  await page.getByRole('button', { name: /^Durata/ }).click(); // 10 → 15
  await page.getByRole('button', { name: /^Durata/ }).click(); // 15 → 20
  await page.getByRole('button', { name: /^Durata/ }).click(); // 20 → 3
  await expect(page.getByRole('button', { name: /^Durata/ })).toHaveText('3 min');

  await page.getByRole('button', { name: 'Inizia' }).click();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.locator('.breath-controls')).toHaveAttribute('aria-hidden', 'true');
  await page.clock.runFor(500);
  await expect(word(page)).toHaveText('inspira');
  await page.clock.runFor(4000);
  await expect(word(page)).toHaveText('espira');

  // 3 minutes = 18 breaths of 10 s.
  await page.clock.fastForward('02:56');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respiro concluso');
  await expect(page.locator('.done-value')).toHaveText('3 min');
  await page.getByRole('button', { name: 'Chiudi' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('susokukan counts exhalations in words, 1 to 10', async ({ page }) => {
  await page.getByRole('button', { name: 'Susokukan' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  await page.clock.runFor(5000);
  await expect(word(page)).toHaveText('uno');
  await jump(page, 10_000);
  await expect(word(page)).toHaveText('due');
  await jump(page, 80_000);
  await expect(word(page)).toHaveText('dieci');
  await jump(page, 10_000);
  await expect(word(page)).toHaveText('uno');
});

test('pause freezes the pacer; paused session can be ended', async ({ page }) => {
  await page.getByRole('button', { name: 'Quadrato' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  await page.clock.runFor(5000);
  await expect(word(page)).toHaveText('trattieni');
  await page.getByRole('button', { name: 'Pausa' }).click();
  await jump(page, 10_000);
  await expect(word(page)).toHaveText('trattieni');
  await page.getByRole('button', { name: 'Termina' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respiro interrotto');
});

test('custom pattern: edit phases and keep them', async ({ page }) => {
  await page.getByRole('button', { name: 'Personale' }).click();
  await page.getByRole('button', { name: 'Espirazione: più' }).click();
  await page.getByRole('button', { name: 'Pausa a polmoni vuoti: meno' }).click();
  await page.getByRole('button', { name: 'Pausa a polmoni vuoti: meno' }).click();
  await page.getByRole('button', { name: 'Fatto' }).click();
  await expect(page.locator('.breath-subtitle')).toHaveText('Personale · 4–2–7');
  await page.reload();
  await expect(page.locator('.breath-subtitle')).toHaveText('Personale · 4–2–7');
});

test('reduced motion: the sphere keeps its size and breathes in brightness', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'Coerenza' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  const sphere = page.locator('.pacer__sphere');
  await page.clock.runFor(1000);
  const early = await sphere.evaluate((el) => [el.style.transform, Number(el.style.opacity)]);
  await page.clock.runFor(3500);
  const full = await sphere.evaluate((el) => [el.style.transform, Number(el.style.opacity)]);
  expect(early[0]).toBe('scale(1)');
  expect(full[0]).toBe('scale(1)');
  expect(full[1]).toBeGreaterThan(Number(early[1]));
});
