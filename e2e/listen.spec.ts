import { expect, test, type Page } from './fixtures';
import { ROUTES } from '../src/config/routes';
import { STOP_SHORTCUT_KEY } from '../src/features/audio/ui/stopShortcut';
import { es } from '../src/i18n/es';

const { listen, audio } = es;
const OWNER = 'e2e-user';
const SAVED_ID = '019a8c8e-2b10-7000-8000-0000000000e2';

/** Accepts the warnings the first time a screen that sounds is opened (RF-17). */
async function acceptWarnings(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle, exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
}

const player = (page: Page) => page.locator('.listen-player');
/** The status line of the playback panel, inside the player: a melody card may say it plays too. */
const playing = (page: Page) => player(page).getByRole('status').filter({ hasText: audio.playback.states.playing });

/** A melody saved twelve and a half minutes in, written where the app keeps them (IndexedDB version 3). */
async function storeMelody(page: Page): Promise<void> {
  await page.evaluate(async ({ id, owner }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('neuromelody');
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error ?? new Error('open failed')); };
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('melodies', 'readwrite');
      transaction.objectStore('melodies').put({
        id, ownerId: owner, name: 'Costa de prueba', seed: 4242, instrument: 'warm', ambience: 'sea', profile: 'original',
        level: 'target', positionS: 750, musicMix: 1, ambienceMix: 0.7, synthesisVersion: 1,
        createdAt: '2026-11-15T21:00:00.000Z', updatedAt: '2026-11-15T21:00:00.000Z',
      });
      transaction.oncomplete = () => { resolve(); };
      transaction.onerror = () => { reject(transaction.error ?? new Error('write failed')); };
    });
    database.close();
  }, { id: SAVED_ID, owner: OWNER });
}

test('Listen plays without a sensor, keeps the music across its tabs and saves a melody (P-17)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(ROUTES.app);

  // Reached from the navigation; the warnings come first and lead back to it.
  await page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: es.app.navigation.listen }).click();
  await acceptWarnings(page);
  await expect(page.getByRole('heading', { level: 1, name: listen.pageTitle })).toBeVisible();
  await expect(page).toHaveURL(ROUTES.listen);

  await page.getByRole('radio', { name: es.plan.worlds.names.night_coast, exact: true }).check();
  await player(page).getByRole('button', { name: listen.player.play }).click();
  await expect(playing(page)).toBeVisible();
  await expect(player(page).getByRole('heading', { name: es.plan.worlds.names.night_coast })).toBeVisible();
  await expect(page.getByRole('button', { name: audio.playback.stop, exact: true })).toBeInViewport();

  // Changing the choices while it plays does not touch the music; the player says when they will sound.
  await page.getByRole('radio', { name: es.plan.worlds.names.city_rain, exact: true }).check();
  await expect(page.getByText(listen.player.nextNotice)).toBeVisible();
  await expect(playing(page)).toBeVisible();

  // The other tab keeps the music: the tab travels in the query, so the screen is not mounted again.
  await page.getByRole('link', { name: listen.tabs.melodies(0) }).click();
  await expect(page).toHaveURL(`${ROUTES.listen}?tab=melodies`);
  await expect(page.getByText(listen.melodies.empty)).toBeVisible();
  await expect(playing(page)).toBeVisible();

  // Saving asks for a name; Escape closes the dialog without stopping the music.
  await player(page).getByRole('button', { name: listen.player.save }).click();
  await expect(page.getByRole('dialog', { name: listen.save.title })).toBeVisible();
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(page.getByRole('dialog', { name: listen.save.title })).toBeHidden();
  await expect(playing(page)).toBeVisible();
  await player(page).getByRole('button', { name: listen.player.save }).click();
  await page.getByLabel(listen.save.nameLabel).fill('Mi costa');
  await page.getByRole('button', { name: listen.save.confirm, exact: true }).click();
  await expect(player(page).locator('.listen-saved')).toHaveText(new RegExp(listen.player.saved));
  await expect(page.getByRole('heading', { level: 3, name: 'Mi costa' })).toBeVisible();
  await expect(page.getByRole('link', { name: listen.tabs.melodies(1) })).toBeVisible();

  // Back leaves Listen: the tabs replaced their entry instead of adding one.
  await page.goBack();
  await expect(page).toHaveURL(ROUTES.app);
  expect(errors).toEqual([]);
});

test('leaving Listen pauses the piece, which waits to be resumed; a saved melody plays from its minute (P-17)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(ROUTES.listen);
  await acceptWarnings(page);
  await storeMelody(page);
  await page.reload();

  // A link that names a melody brings it into sight without playing it.
  await page.goto(`${ROUTES.listen}?tab=melodies&melody=${SAVED_ID}`);
  const card = page.locator('.melody-card', { hasText: 'Costa de prueba' });
  await expect(card).toBeFocused();
  await expect(page.getByText(audio.playback.states.playing, { exact: true })).toHaveCount(0);

  await card.getByRole('button', { name: listen.melodies.fromMinute(12) }).click();
  await expect(playing(page)).toBeVisible();
  await expect(player(page).getByRole('heading', { name: 'Costa de prueba' })).toBeVisible();
  await expect(card.getByText(listen.melodies.playing)).toBeVisible();

  // Going elsewhere stops it; coming back finds it paused, ready to resume.
  await page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: es.app.navigation.history }).click();
  await expect(page.getByRole('heading', { level: 1, name: es.history.title })).toBeVisible();
  await page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: es.app.navigation.listen }).click();
  await expect(player(page).getByText(listen.player.phases.paused)).toBeVisible();
  await expect(player(page).getByRole('heading', { name: 'Costa de prueba' })).toBeVisible();
  await player(page).getByRole('button', { name: listen.player.resume }).click();
  await expect(playing(page)).toBeVisible();

  // Escape pauses it; deleting the melody while it is held keeps the piece, now unsaved.
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(player(page).getByText(listen.player.phases.paused)).toBeVisible();
  await page.getByRole('link', { name: listen.tabs.melodies(1) }).click();
  await page.locator('.melody-card').getByLabel(listen.melodies.more('Costa de prueba')).click();
  await page.getByRole('button', { name: listen.melodies.delete }).click();
  await page.getByRole('button', { name: listen.melodies.deleteConfirm }).click();
  await expect(page.getByText(listen.melodies.empty)).toBeVisible();
  await expect(player(page).getByText(listen.player.unsaved)).toBeVisible();
  await expect(player(page).getByRole('button', { name: listen.player.save })).toBeVisible();
  expect(errors).toEqual([]);
});

test('on a phone the main action sits in one bar at the bottom, and Stop takes its place while it plays (P-17)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTES.listen);
  await acceptWarnings(page);
  const bar = page.locator('.listen-bar');
  await expect(bar.getByRole('button', { name: listen.player.play })).toBeInViewport();

  await bar.getByRole('button', { name: listen.player.play }).click();
  await expect(playing(page)).toBeVisible();
  await expect(bar).toHaveCount(0);
  await expect(page.getByRole('button', { name: audio.playback.stop, exact: true })).toBeInViewport();

  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(bar.getByRole('button', { name: listen.player.resume })).toBeInViewport();
  await expect(bar.getByRole('button', { name: listen.player.newPiece })).toBeVisible();
  await expect(page.getByRole('button', { name: audio.playback.stop, exact: true })).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
