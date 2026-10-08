import { expect, test } from './fixtures';

test('Oggi lists the other practices like the design', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Altre pratiche' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Respirazione/ })).toContainText(
    'Espirazione lunga · 6 min',
  );
  await expect(page.getByRole('link', { name: /Paesaggio sonoro/ })).toContainText(
    'Pioggia · bordone',
  );
});

test('soundscape: mix layers, listen and stop', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: /Paesaggio sonoro/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paesaggio sonoro');
  await expect(page.getByRole('navigation')).toHaveCount(0);

  await page.getByRole('switch', { name: /Vento/ }).click();
  await expect(page.locator('.breath-subtitle')).toHaveText('Pioggia · vento · bordone');
  await expect(page.getByRole('slider', { name: 'Volume vento' })).toBeEnabled();
  await expect(page.getByRole('slider', { name: 'Volume acqua' })).toBeDisabled();

  await page.getByRole('button', { name: 'Ascolta' }).click();
  await expect(page.getByRole('button', { name: 'Ferma' })).toHaveAttribute('aria-pressed', 'true');
  // Live changes while playing must not throw.
  await page.getByRole('switch', { name: /Acqua/ }).click();
  await page.getByRole('slider', { name: 'Volume pioggia' }).fill('30');
  await page.getByRole('button', { name: 'Ferma' }).click();
  await expect(page.getByRole('button', { name: 'Ascolta' })).toBeVisible();

  await page.reload();
  await expect(page.locator('.breath-subtitle')).toHaveText('Pioggia · vento · acqua · bordone');
  await page.getByRole('link', { name: 'Torna a Oggi' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Buongiorno|Buon pomeriggio|Buonasera/,
  );
});

test('a sitting with ambient sound starts and ends cleanly', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-08T07:00:00') });
  await page.goto('./#/zazen');
  await page.clock.pauseAt(new Date('2026-10-08T07:00:01'));
  await page.getByRole('switch', { name: /Ambiente/ }).click();
  await expect(page.getByRole('switch', { name: /Ambiente/ })).toContainText('Pioggia · bordone');
  await page.getByRole('button', { name: '15', exact: true }).click();
  await page.getByRole('button', { name: 'Inizia la seduta' }).click();
  await page.clock.fastForward('16:00');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seduta conclusa');
});
