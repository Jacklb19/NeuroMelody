import { expect, test } from './fixtures';
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
  await page.getByRole('button', { name: es.acquisition.trial.enter }).click();
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await expect(page.getByTestId('received-beats')).not.toHaveText('0');
  await page.getByRole('button', { name: playback.start }).click();
  await expect(page.getByText(playback.states.playing, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: playback.stop, exact: true })).toBeInViewport();
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(page.getByText(playback.states.stopped, { exact: true })).toBeVisible();
  // Stopping pauses the session (ADR-52): resuming goes on with it, finishing ends it.
  await page.getByRole('button', { name: es.session.paused.resume }).click();
  await expect(page.getByText(playback.states.playing, { exact: true })).toBeVisible();
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await page.getByRole('button', { name: es.session.paused.finish }).click();
  // The simulator only tries the app: the session says it was not kept.
  await expect(page.getByTestId('trial-ended')).toBeVisible();
  await expect(page.getByRole('button', { name: es.session.paused.resume })).toHaveCount(0);
  await expect(page.getByRole('button', { name: playback.start })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the immersive view keeps the orb, the time and Stop, and ends when the music stops (ADR-60)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(ROUTES.session);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByRole('button', { name: es.acquisition.trial.enter }).click();
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await expect(page.getByTestId('received-beats')).not.toHaveText('0');
  await page.getByRole('button', { name: playback.start }).click();
  await expect(page.getByText(playback.states.playing, { exact: true })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: es.app.mainNavigation });
  await expect(navigation).toBeVisible();
  await page.getByRole('button', { name: es.session.immersive.enter }).click();
  await expect(navigation).toBeHidden();
  await expect(page.getByLabel(playback.volume)).toBeHidden();
  await expect(page.getByRole('progressbar', { name: es.session.progress.label })).toBeVisible();
  await expect(page.getByRole('button', { name: playback.stop, exact: true })).toBeInViewport();

  // Leaving it brings everything back while the music goes on.
  await page.getByRole('button', { name: es.session.immersive.exit }).click();
  await expect(navigation).toBeVisible();
  await expect(page.getByText(playback.states.playing, { exact: true })).toBeVisible();

  // Stopping from inside it shows the pause with its two ways on, never an empty screen.
  await page.getByRole('button', { name: es.session.immersive.enter }).click();
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('button', { name: es.session.paused.resume })).toBeVisible();
  expect(errors).toEqual([]);
});
