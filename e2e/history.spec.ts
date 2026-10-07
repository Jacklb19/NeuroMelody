import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('saves a session on the device, rates it after listening and deletes it from the history', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/session');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('radio', { name: '5' }).check();
  await page.getByRole('combobox', { name: 'Velocidad', exact: true }).selectOption('10');
  await page.getByRole('button', { name: 'Conectar simulador' }).click();
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await expect(page.getByText('Al empezar te sentías en 5 de 10.')).toBeVisible();

  // Ten seconds at 10× give about 100 s of signal: enough for indices.
  await page.getByText('Detalles técnicos', { exact: true }).click();
  await expect(page.getByTestId('rmssd')).not.toHaveText('—', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Detener', exact: true }).click();
  await page.getByRole('link', { name: 'Ver resumen de la sesión' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('de 2026');
  await page.getByRole('radio', { name: '8' }).check();
  await page.getByRole('button', { name: 'Guardar valoración' }).click();
  await expect(page.getByText('5 → 8')).toBeVisible();

  // The history survives a reload because it lives in IndexedDB.
  await page.goto('/history');
  await page.reload();
  const item = page.getByRole('main').getByRole('listitem');
  await expect(item).toHaveCount(1);
  await expect(item.getByText('5 → 8')).toBeVisible();
  await item.getByRole('button', { name: 'Borrar' }).click();
  await item.getByRole('button', { name: 'Sí, borrar esta sesión' }).click();
  await expect(page.getByText(/aún no hay sesiones guardadas/i)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
