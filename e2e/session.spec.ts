import { expect, test } from '@playwright/test';
import { ROUTES } from '../src/config/routes';
import { STOP_SHORTCUT_KEY } from '../src/features/audio/ui/stopShortcut';
import { es } from '../src/i18n/es';

const { playback } = es.audio;

test('requires warnings before starting and stops playback from the keyboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(ROUTES.session);
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle })).toBeVisible();
  await expect(page.getByRole('button', { name: es.warnings.accept })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await expect(page.getByTestId('received-beats')).not.toHaveText('0');
  await page.getByRole('button', { name: playback.start }).click();
  await expect(page.getByText(playback.states.playing, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: playback.stop, exact: true })).toBeInViewport();
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(page.getByText(playback.states.stopped, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
