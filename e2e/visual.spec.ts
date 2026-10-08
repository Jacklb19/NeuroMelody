import { test, expect } from '@playwright/test';
import { APP_NAME } from '../src/config/app';
import { ROUTES } from '../src/config/routes';
import { DEFAULT_RECORDING_ID, recordingUrl } from '../src/features/acquisition/recording/recordingCatalog';
import type { SourceKind } from '../src/features/acquisition/sourceCatalog';
import type { Speed } from '../src/features/acquisition/speedCatalog';
import { STOP_SHORTCUT_KEY } from '../src/features/audio/ui/stopShortcut';
import { es } from '../src/i18n/es';

test.use({ serviceWorkers: 'block' });

const { acquisition } = es;
const { playback } = es.audio;
/** Signal speed-up, so the indices are ready within the timeout below. */
const SPEED: Speed = 10;
const RECORDING_SOURCE: SourceKind = 'recording';

for (const width of [360, 768, 1280]) {
  test(`existing screens remain readable and operable at ${String(width)}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const [screen, title] of [
      ['home', APP_NAME],
      ['plan', es.plan.pageTitle],
      ['warnings', es.warnings.pageTitle],
      ['diagnostics', es.diagnostics.pageTitle],
    ] as const) {
      await page.goto(ROUTES[screen]);
      await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${screen}.png`), fullPage: true });
    }

    await page.goto(ROUTES.session);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: es.warnings.accept }).click();
    const stop = page.getByRole('button', { name: playback.stop, exact: true });
    await expect(stop).toBeVisible();
    await expect(stop).toBeDisabled();
    await expect(page.getByText(es.session.stage.confidence)).toBeVisible();
    await expect(page.getByTestId('activation-state')).toHaveText(es.adaptation.states.calibrating);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.screenshot({ path: testInfo.outputPath('session-empty.png'), fullPage: true });
    await page.getByRole('combobox', { name: acquisition.speedLabel, exact: true }).selectOption(String(SPEED));
    await page.getByRole('button', { name: acquisition.connect.simulator }).click();
    await page.getByRole('button', { name: playback.start }).click();
    await expect(stop).toBeEnabled();
    await page.getByText(es.session.technicalDetails.title, { exact: true }).click();
    await expect(page.getByTestId('rmssd')).not.toHaveText(es.common.noValue, { timeout: 15_000 });
    await page.getByTestId('discarded-beats').scrollIntoViewIfNeeded();
    await expect(stop).toBeInViewport();
    expect(await stop.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('session-connected.png'), fullPage: true });
    await page.getByRole('slider', { name: playback.volume }).focus();
    await page.keyboard.press('Tab');
    await expect(stop).toBeFocused();
    expect(await stop.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    expect(await stop.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
    await page.keyboard.press(STOP_SHORTCUT_KEY);
    await expect(stop).toBeDisabled();
    await expect(page.getByText(playback.states.stopped, { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

test('loading and error messages remain usable on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 900 });
  let releaseRequest: () => void = () => undefined;
  const pendingRequest = new Promise<void>(resolve => { releaseRequest = resolve; });
  // The recording selected by default, which the connect button plays when no other is chosen.
  await page.route(`**${recordingUrl(DEFAULT_RECORDING_ID)}`, async route => {
    await pendingRequest;
    await route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: function unavailableAudioContext() {
        throw new Error('AudioContext unavailable in this test');
      },
    });
  });
  await page.goto(ROUTES.session);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByRole('combobox', { name: acquisition.sourceLabel, exact: true }).selectOption(RECORDING_SOURCE);
  await page.getByRole('button', { name: acquisition.connect.recording }).click();
  await expect(page.getByRole('combobox', { name: acquisition.recordingLabel, exact: true })).toBeDisabled();
  await expect(page.getByText(acquisition.connectionStates.connecting, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('recording-loading.png'), fullPage: true });
  releaseRequest();
  // The 503 response is a failed download of the recording.
  await expect(page.getByRole('alert')).toContainText(
    acquisition.sourceErrors.recording(acquisition.recordingErrors.load_failed),
  );
  await expect(page.getByRole('combobox', { name: acquisition.recordingLabel, exact: true })).toBeEnabled();
  await page.getByRole('button', { name: playback.start }).click();
  await expect(page.getByText(playback.states.error, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('session-errors.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: playback.stop, exact: true })).toBeInViewport();
});
