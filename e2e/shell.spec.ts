import { expect, test } from './fixtures';

test('opens on Oggi with date and greeting', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Zenfullness');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Buongiorno|Buon pomeriggio|Buonasera/,
  );
  await expect(page.getByRole('link', { name: 'Oggi', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('navigates between tabs', async ({ page }) => {
  await page.goto('./');
  for (const name of ['Zazen', 'Respiro', 'Guidate', 'Storico']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
});

test('deep links work', async ({ page }) => {
  await page.goto('./#/storico');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Storico');
});

test('settings are reachable by keyboard and back', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Apri le impostazioni' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Impostazioni');
  await page.getByRole('link', { name: 'Torna indietro' }).click();
  await expect(page.getByRole('link', { name: 'Oggi', exact: true })).toBeVisible();
});

test('the page never contacts a third-party host', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.hostname !== 'localhost') foreign.push(req.url());
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});
