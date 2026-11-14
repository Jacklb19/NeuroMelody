import { test, expect, type Page } from './fixtures';
import { ROUTES } from '../src/config/routes';
import type { Speed } from '../src/features/acquisition/speedCatalog';
import type { SessionRecord } from '../src/features/records/sessionRecord';
import { es } from '../src/i18n/es';

test.use({ serviceWorkers: 'block' });

const { playback } = es.audio;
const copy = es.records.draftRecovery;
const SPEED: Speed = 10;
/** The account the fixtures sign in with. */
const OWNER = 'e2e-user';

/** A measured session: a test browser has no strap, so it is written where the app keeps them. */
function measured(id: string, listenedSeconds: number): SessionRecord {
  return {
    id,
    startedAt: '2026-11-14T09:00:00.000Z',
    endedAt: '2026-11-14T09:12:00.000Z',
    plannedMinutes: 20,
    goals: [],
    listenedSeconds,
    sourceKind: 'ble',
    ratingBefore: null,
    ratingAfter: null,
    samples: [72, 70, 68].map((meanHr, index) => ({
      second: (index + 1) * 5, meanHr, rmssd: 30, sdnn: 35, lfHfRatio: null, estimatedState: null, goodQuality: true,
    })),
    ownerId: OWNER,
  };
}

/** Writes into the history database as version 1 did, before the app ever opens it. */
function seedVersionOne(page: Page, record: SessionRecord): Promise<void> {
  return page.evaluate((session) => new Promise<void>((done, fail) => {
    const request = indexedDB.open('neuromelody', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('sessions', { keyPath: 'id' }); };
    request.onerror = () => { fail(new Error('could not open the history')); };
    request.onsuccess = () => {
      const transaction = request.result.transaction('sessions', 'readwrite');
      transaction.objectStore('sessions').put(session);
      transaction.oncomplete = () => { request.result.close(); done(); };
    };
  }), record);
}

/** Leaves a draft as the session page does every 15 s, for a page that then closed. */
function leaveDraft(page: Page, record: SessionRecord): Promise<void> {
  return page.evaluate(({ session, owner }) => new Promise<void>((done, fail) => {
    const request = indexedDB.open('neuromelody');
    request.onerror = () => { fail(new Error('could not open the history')); };
    request.onsuccess = () => {
      const transaction = request.result.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put({ id: session.id, ownerId: owner, savedAt: new Date().toISOString(), record: session });
      transaction.oncomplete = () => { request.result.close(); done(); };
      transaction.onerror = () => { fail(new Error('could not store the draft')); };
    };
  }), { session: record, owner: OWNER });
}

test('a reload mid-session keeps the older history, never restarts the music, and keeps nothing of a trial', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const kept = measured('019a0000-0000-7000-8000-0000000000f1', 1200);

  // A history written by the version before drafts existed: a file of the app's own origin that does not run it.
  await page.goto('/icon.svg');
  await seedVersionOne(page, kept);

  await page.goto(ROUTES.session);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByRole('button', { name: es.acquisition.trial.enter }).click();
  await page.getByRole('combobox', { name: es.acquisition.speedLabel, exact: true }).selectOption(String(SPEED));
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await page.getByRole('button', { name: playback.start }).click();
  // The immersive view is offered only while the music sounds (ADR-60).
  await expect(page.getByRole('button', { name: es.session.immersive.enter })).toBeVisible();

  await page.reload();

  // Nothing plays by itself after the reload, and a trial leaves nothing to recover.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The page is back at its first step, measuring the pulse, and no music plays.
  await expect(page.getByRole('heading', { name: es.session.slides.names.pulse, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: es.session.immersive.enter })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: copy.title })).toHaveCount(0);

  // The upgrade to the new database version kept the session saved before it.
  await page.goto(ROUTES.history);
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
  expect(pageErrors).toEqual([]);
});

test('a session left open is offered once to its account, and saved with its own id', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const open = measured('019a0000-0000-7000-8000-0000000000f2', 720);

  await page.goto(ROUTES.history);
  await expect(page.getByText(es.history.empty)).toBeVisible();
  await leaveDraft(page, open);

  await page.reload();
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible();
  await expect(page.getByText(/12 min/).first()).toBeVisible();
  await page.getByRole('button', { name: copy.save }).click();
  await expect(page.getByText(copy.saved)).toBeVisible();

  // Saved once: the history has it, and opening the app again offers nothing.
  await page.goto(ROUTES.history);
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: copy.title })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
