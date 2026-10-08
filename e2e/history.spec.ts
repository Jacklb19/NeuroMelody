import { test, expect } from '@playwright/test';
import { ROUTES } from '../src/config/routes';
import type { Speed } from '../src/features/acquisition/speedCatalog';
import { MAX_RATING } from '../src/features/records/sessionRecord';
import { es } from '../src/i18n/es';

test.use({ serviceWorkers: 'block' });

const { playback } = es.audio;
/** Two different self-ratings within the scale, given before and after listening. */
const RATING_BEFORE = 5;
const RATING_AFTER = 8;
/** Signal speed-up, so the indices are ready within seconds. */
const SPEED: Speed = 10;
/** How the summary and the history show both self-ratings. */
const ratingChange = es.records.change(String(RATING_BEFORE), String(RATING_AFTER));

test('saves a session on the device, rates it after listening and deletes it from the history', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(ROUTES.session);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByRole('radio', { name: String(RATING_BEFORE) }).check();
  await page.getByRole('combobox', { name: es.acquisition.speedLabel, exact: true }).selectOption(String(SPEED));
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await page.getByRole('button', { name: playback.start }).click();
  await expect(page.getByText(es.session.checkIn.ratingBefore(RATING_BEFORE, MAX_RATING))).toBeVisible();

  // Ten seconds at 10× give about 100 s of signal: enough for indices.
  await page.getByText(es.session.technicalDetails.title, { exact: true }).click();
  await expect(page.getByTestId('rmssd')).not.toHaveText(es.common.noValue, { timeout: 20_000 });
  await page.getByRole('button', { name: playback.stop, exact: true }).click();
  await page.getByRole('link', { name: es.session.checkIn.viewSummary }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('de 2026');
  await page.getByRole('radio', { name: String(RATING_AFTER) }).check();
  await page.getByRole('button', { name: es.summary.afterRating.save }).click();
  await expect(page.getByText(ratingChange)).toBeVisible();

  // The history survives a reload because it lives in IndexedDB.
  await page.goto(ROUTES.history);
  await page.reload();
  const item = page.getByRole('main').getByRole('listitem');
  await expect(item).toHaveCount(1);
  await expect(item.getByText(ratingChange)).toBeVisible();
  await item.getByRole('button', { name: es.history.item.delete }).click();
  await item.getByRole('button', { name: es.history.item.confirmDelete }).click();
  await expect(page.getByText(es.history.empty)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
