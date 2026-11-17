import { expect, test, type Page } from './fixtures';
import { ROUTES } from '../src/config/routes';
import { es } from '../src/i18n/es';
import { WARNINGS_STORAGE_KEY } from '../src/features/warnings/warningsRegistry';

const copy = es.listen.player;
const stage = (page: Page) => page.locator('.player-stage');
const soundSettings = (page: Page) => page.getByText(copy.soundSettings, { exact: true });
const nav = (page: Page, label: string) => page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: label, exact: true });

async function enter(page: Page): Promise<void> {
  await page.goto(ROUTES.listen);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
}

async function seedQueue(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('neuromelody');
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(new Error('Cannot open database')); };
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('melodies', 'readwrite');
      for (const [index, name] of ['Primera costa', 'Segunda costa'].entries()) {
        transaction.objectStore('melodies').put({
          id: `019a8c8e-2b10-7000-8000-00000000000${String(index)}`, ownerId: 'e2e-user', name,
          seed: 4242 + index, instrument: 'warm', ambience: 'sea', profile: 'original', level: 'target',
          positionS: 0, durationMin: 15, musicMix: 1, ambienceMix: 1, synthesisVersion: 1,
          createdAt: `2026-11-${String(16 - index)}T21:00:00.000Z`, updatedAt: `2026-11-${String(16 - index)}T21:00:00.000Z`,
        });
      }
      transaction.oncomplete = () => { resolve(); };
      transaction.onerror = () => { reject(new Error('Cannot seed queue')); };
    });
    database.close();
  });
  await page.reload();
  await page.getByRole('link', { name: es.listen.tabs.melodies(2) }).click();
}

test('the same audio graph survives navigation and a background tab; previews and sessions take over', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const observed = window as Window & { testAudioContexts?: AudioContext[] };
    observed.testAudioContexts = [];
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args: ConstructorParameters<typeof AudioContext>) {
        const audio = new target(...args);
        observed.testAudioContexts?.push(audio);
        return audio;
      },
    });
  });
  await enter(page);
  await page.getByRole('radio', { name: es.plan.worlds.names.night_coast, exact: true }).check();
  await page.getByRole('button', { name: es.listen.create.action }).click();
  await expect(stage(page).getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
  const countGraphs = (): Promise<number> => page.evaluate(() => (window as Window & { testAudioContexts?: AudioContext[] }).testAudioContexts?.length ?? 0);
  const graphCount = await countGraphs();
  expect(graphCount).toBeGreaterThan(0);
  const mix = page.getByRole('slider', { name: es.listeningTools.ambienceMix });
  await expect(mix).toBeHidden();
  await soundSettings(page).click();
  await mix.fill('42');
  await soundSettings(page).click();
  await expect(mix).toBeHidden();
  await soundSettings(page).click();
  await expect(mix).toHaveValue('42');
  expect(await countGraphs()).toBe(graphCount);
  await nav(page, es.app.navigation.history).click();
  const bar = page.locator('.listening-bar');
  await expect(bar).toHaveAttribute('data-phase', 'playing');
  expect(await countGraphs()).toBe(graphCount);
  const clock = (): Promise<number> => page.evaluate(() => (window as Window & { testAudioContexts?: AudioContext[] }).testAudioContexts?.find((audio) => audio.state === 'running')?.currentTime ?? -1);
  const before = await clock();
  const other = await context.newPage();
  await other.bringToFront();
  await expect.poll(clock).toBeGreaterThan(before + 1);
  await other.close();
  await page.bringToFront();
  await bar.getByRole('button', { name: copy.pause, exact: true }).click();
  await expect(bar).toHaveAttribute('data-phase', 'paused');
  await bar.getByRole('button', { name: copy.resume, exact: true }).click();
  await expect(bar).toHaveAttribute('data-phase', 'playing');
  await nav(page, es.app.navigation.plan).click();
  await page.getByRole('button', { name: es.listeningTools.preview, exact: true }).click();
  await expect(bar).toHaveAttribute('data-phase', 'paused');
  await expect(page.getByRole('button', { name: es.listeningTools.previewStop, exact: true })).toBeVisible();
  await bar.getByRole('button', { name: copy.resume, exact: true }).click();
  await expect(page.getByRole('button', { name: es.listeningTools.preview, exact: true })).toBeVisible();
  await expect(bar).toHaveAttribute('data-phase', 'playing');
  await page.getByRole('button', { name: es.plan.continueToSession, exact: true }).click();
  await expect(page.locator('.session-page')).toBeVisible();
  await expect(bar).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the queue advances automatically from zero and stops after the last melody', async ({ page }) => {
  await enter(page);
  await seedQueue(page);
  await page.getByRole('button', { name: es.listen.melodies.playNamed('Primera costa') }).click();
  await expect(stage(page).getByRole('heading', { name: 'Primera costa', exact: true })).toBeVisible();
  await expect(stage(page).getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
  await soundSettings(page).click();
  await expect(page.getByRole('checkbox', { name: copy.autoNext })).toBeChecked();
  await page.getByRole('slider', { name: copy.seekLabel }).press('End');
  await expect(stage(page).getByRole('heading', { name: 'Segunda costa', exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${ROUTES.listen}?tab=melodies`);
  await expect(stage(page).getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: copy.seekLabel })).toHaveAttribute('aria-valuetext', /^00:0\d de 15:00$/);
  await page.getByRole('slider', { name: copy.seekLabel }).press('End');
  await expect(page.getByText(copy.phases.ended, { exact: true })).toBeVisible();
  await expect(stage(page).getByRole('heading', { name: 'Segunda costa', exact: true })).toBeVisible();
});

test('turning automatic advance off persists on reload and stops at the current melody', async ({ page }) => {
  await enter(page);
  await seedQueue(page);
  await page.getByRole('button', { name: es.listen.melodies.playNamed('Primera costa') }).click();
  await expect(stage(page).getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
  await stage(page).getByRole('button', { name: copy.next, exact: true }).click();
  await expect(stage(page).getByRole('heading', { name: 'Segunda costa', exact: true })).toBeVisible();
  await expect(stage(page).getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
  await stage(page).getByRole('button', { name: copy.previous, exact: true }).click();
  await expect(stage(page).getByRole('heading', { name: 'Primera costa', exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${ROUTES.listen}?tab=melodies`);
  await soundSettings(page).click();
  await page.getByRole('checkbox', { name: copy.autoNext }).uncheck();
  await page.reload();
  await soundSettings(page).click();
  await expect(page.getByRole('checkbox', { name: copy.autoNext })).not.toBeChecked();
  await stage(page).getByRole('button', { name: copy.resume, exact: true }).click();
  await expect(stage(page).getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
  await page.getByRole('slider', { name: copy.seekLabel }).press('End');
  await expect(page.getByText(copy.phases.ended, { exact: true })).toBeVisible();
  await expect(stage(page).getByRole('heading', { name: 'Primera costa', exact: true })).toBeVisible();
});

test('a recovered piece cannot bypass the warnings through the global resume button', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: es.listen.create.action }).click();
  await stage(page).getByRole('button', { name: copy.pause, exact: true }).click();
  await page.evaluate((key) => { localStorage.removeItem(key); }, WARNINGS_STORAGE_KEY);
  await page.goto(ROUTES.app);
  const bar = page.locator('.listening-bar');
  await expect(bar).toHaveAttribute('data-phase', 'paused');
  await bar.getByRole('button', { name: copy.resume, exact: true }).click();
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle, exact: true })).toBeVisible();
  await expect(bar).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await expect(page).toHaveURL(ROUTES.listen);
  await expect(stage(page).getByRole('button', { name: copy.resume, exact: true })).toBeVisible();
});
