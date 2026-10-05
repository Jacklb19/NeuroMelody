import { expect, test } from '@playwright/test';

test('requires warnings before starting and stops playback from the keyboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/session');
  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceptar y continuar' })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('button', { name: 'Conectar simulador' }).click();
  await expect(page.getByTestId('received-beats')).not.toHaveText('0');
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await expect(page.getByText('Sonando', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detener', exact: true })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Detenida', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
