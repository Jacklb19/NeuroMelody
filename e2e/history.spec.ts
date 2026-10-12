import { test, expect, type Page } from '@playwright/test';
import { ROUTES, summaryPath } from '../src/config/routes';
import type { Speed } from '../src/features/acquisition/speedCatalog';
import type { SessionRecord } from '../src/features/records/sessionRecord';
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

/**
 * A session as the app stores one measured with a strap. A test browser has
 * no strap or camera with a pulse, so the session is put where the app keeps
 * them; recording one is covered by the unit tests of the recorder.
 */
const MEASURED: SessionRecord = {
  id: '019a0000-0000-7000-8000-0000000000e2',
  startedAt: '2026-10-07T15:00:00.000Z',
  endedAt: '2026-10-07T15:20:00.000Z',
  plannedMinutes: 20,
  goals: [],
  listenedSeconds: 1200,
  sourceKind: 'ble',
  ratingBefore: RATING_BEFORE,
  ratingAfter: null,
  samples: [78, 76, 74, 70, 69, 68].map((meanHr, index) => ({
    second: (index + 1) * 5, meanHr, rmssd: 30, sdnn: 35, lfHfRatio: null, estimatedState: null, goodQuality: true,
  })),
};

function storeSession(page: Page, record: SessionRecord): Promise<void> {
  return page.evaluate((session) => new Promise<void>((done, fail) => {
    const request = indexedDB.open('neuromelody', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('sessions', { keyPath: 'id' }); };
    request.onerror = () => { fail(new Error('could not open the history')); };
    request.onsuccess = () => {
      const transaction = request.result.transaction('sessions', 'readwrite');
      transaction.objectStore('sessions').put(session);
      transaction.oncomplete = () => { request.result.close(); done(); };
      transaction.onerror = () => { fail(new Error('could not store the session')); };
    };
  }), record);
}

test('keeps nothing of a trial session, and rates and deletes a measured one from the history', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // A session with the simulator plays like any other and is not kept.
  await page.goto(ROUTES.session);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByRole('button', { name: es.acquisition.trial.enter }).click();
  await expect(page.getByTestId('trial-note')).toBeVisible();
  await page.getByRole('combobox', { name: es.acquisition.speedLabel, exact: true }).selectOption(String(SPEED));
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await page.getByRole('button', { name: playback.start }).click();
  // Ten seconds at 10× give about 100 s of signal: enough for indices.
  await page.getByText(es.session.technicalDetails.title, { exact: true }).click();
  await expect(page.getByTestId('rmssd')).not.toHaveText(es.common.noValue, { timeout: 20_000 });
  await page.getByRole('button', { name: playback.stop, exact: true }).click();
  await expect(page.getByTestId('trial-ended')).toContainText(es.session.checkIn.trialEnded);
  await expect(page.getByRole('link', { name: es.session.checkIn.viewSummary })).toHaveCount(0);
  await page.goto(ROUTES.history);
  await expect(page.getByText(es.history.empty)).toBeVisible();

  // A measured session is rated after listening from its summary.
  await storeSession(page, MEASURED);
  await page.goto(summaryPath(MEASURED.id));
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
