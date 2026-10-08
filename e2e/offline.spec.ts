import { expect, test } from '@playwright/test';
import { ROUTES } from '../src/config/routes';
import type { RecordingId } from '../src/features/acquisition/recording/recordingCatalog';
import type { SourceKind } from '../src/features/acquisition/sourceCatalog';
import type { Speed } from '../src/features/acquisition/speedCatalog';
import { es } from '../src/i18n/es';

const { acquisition } = es;
const { playback } = es.audio;
/** The example recordings are the source that must keep working without a network. */
const SOURCE: SourceKind = 'recording';
const RECORDING_ID: RecordingId = 'nsr002';
/** Signal speed-up, so the indices are ready within the timeout below. */
const SPEED: Speed = 10;

test('loads the session, recording, signal worker and audio worklets offline', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(ROUTES.session);
  expect(response?.headers()['content-security-policy']).toContain("worker-src 'self' blob:");
  expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: es.session.title, exact: true })).toBeVisible();
  await page.getByLabel(acquisition.sourceLabel).selectOption(SOURCE);
  await page.getByRole('combobox', { name: acquisition.recordingLabel, exact: true }).selectOption(RECORDING_ID);
  await page.getByLabel(acquisition.speedLabel).selectOption(String(SPEED));
  await page.getByRole('button', { name: acquisition.connect.recording }).click();
  await expect(page.getByTestId('received-beats')).not.toHaveText('0');
  await page.getByRole('button', { name: playback.start }).click();
  await expect(page.getByText(playback.states.playing, { exact: true })).toBeVisible();
  await expect(page.getByTestId('rmssd')).not.toHaveText(es.common.noValue, { timeout: 15_000 });
  await page.getByRole('button', { name: playback.stop, exact: true }).click();
  await expect(page.getByText(playback.states.stopped, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(async () => {
    try { await fetch('/api/cache-probe'); return true; }
    catch { return false; }
  })).toBe(false);
});
