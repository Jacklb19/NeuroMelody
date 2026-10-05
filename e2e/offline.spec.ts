import { expect, test } from '@playwright/test';

test('loads the session, recording, signal worker and audio worklets offline', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/session');
  expect(response?.headers()['content-security-policy']).toContain("worker-src 'self' blob:");
  expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sesión', exact: true })).toBeVisible();
  await page.getByLabel('Origen de la señal').selectOption('recording');
  await page.getByRole('combobox', { name: 'Registro', exact: true }).selectOption('nsr002');
  await page.getByLabel('Velocidad').selectOption('10');
  await page.getByRole('button', { name: 'Reproducir registro' }).click();
  await expect(page.getByTestId('received-beats')).not.toHaveText('0');
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await expect(page.getByText('Sonando', { exact: true })).toBeVisible();
  await expect(page.getByTestId('rmssd')).not.toHaveText('—', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Detener', exact: true }).click();
  await expect(page.getByText('Detenida', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(async () => {
    try { await fetch('/api/cache-probe'); return true; }
    catch { return false; }
  })).toBe(false);
});
