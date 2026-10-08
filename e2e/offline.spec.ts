import { expect, test } from './fixtures';

test('works offline after the first load', async ({ page, context }) => {
  await page.goto('./');
  // Wait until the service worker controls the page and has precached the app.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.goto('./#/impostazioni');
  await expect(page.getByTestId('offline-state')).toHaveText('Pronta');

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Impostazioni');
  await page.getByRole('link', { name: 'Torna indietro' }).click();
  await expect(page.getByRole('link', { name: 'Zazen' })).toBeVisible();
});
