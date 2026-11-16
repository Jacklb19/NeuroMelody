import { expect, test, type Page } from './fixtures';
import { ROUTES } from '../src/config/routes';
import { STOP_SHORTCUT_KEY } from '../src/features/audio/ui/stopShortcut';
import { es } from '../src/i18n/es';

const { listen } = es;
const OWNER = 'e2e-user';
const SAVED_ID = '019a8c8e-2b10-7000-8000-0000000000e2';

/** Accepts the warnings the first time a screen that sounds is opened (RF-17). */
async function acceptWarnings(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle, exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
}

const player = (page: Page) => page.locator('.listen-player');
/** The stage of the player: its main controls, on the card and in the open player. */
const stage = (page: Page) => page.locator('.player-stage');
const pause = (page: Page) => stage(page).getByRole('button', { name: listen.player.pause, exact: true });

/** A melody of thirty minutes saved twelve and a half minutes in, where the app keeps them (IndexedDB version 3). */
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
        level: 'target', positionS: 750, durationMin: 30, musicMix: 1, ambienceMix: 0.7, synthesisVersion: 1,
        createdAt: '2026-11-15T21:00:00.000Z', updatedAt: '2026-11-15T21:00:00.000Z',
      });
      transaction.oncomplete = () => { resolve(); };
      transaction.onerror = () => { reject(transaction.error ?? new Error('write failed')); };
    });
    database.close();
  }, { id: SAVED_ID, owner: OWNER });
}

test('Listen opens a player that keeps sounding while it closes, changes tab and saves a melody (ADR-67)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(ROUTES.app);

  // Reached from the navigation; the warnings come first and lead back to it.
  await page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: es.app.navigation.listen }).click();
  await acceptWarnings(page);
  await expect(page.getByRole('heading', { level: 1, name: listen.pageTitle })).toBeVisible();

  // Playing opens the player over the screen, with the melodies as its queue.
  await page.getByRole('radio', { name: es.plan.worlds.names.night_coast, exact: true }).check();
  await stage(page).getByRole('button', { name: listen.player.play, exact: true }).click();
  await expect(pause(page)).toBeVisible();
  await expect(page).toHaveURL(`${ROUTES.listen}?player=open`);
  await expect(player(page).getByRole('heading', { name: listen.player.queueTitle })).toBeVisible();
  await expect(player(page).getByRole('heading', { name: es.plan.worlds.names.night_coast })).toBeVisible();

  // Back closes the player, not the screen, and the music goes on.
  await page.goBack();
  await expect(page).toHaveURL(ROUTES.listen);
  await expect(player(page).getByRole('heading', { name: listen.player.queueTitle })).toHaveCount(0);
  await expect(pause(page)).toBeVisible();

  // Changing the choices does not touch the music; the player says when they will sound.
  await page.getByRole('radio', { name: es.plan.worlds.names.city_rain, exact: true }).check();
  await expect(page.getByText(listen.player.nextNotice)).toBeVisible();

  // The other tab keeps the music: the tab travels in the query, so the screen is not mounted again.
  await page.getByRole('link', { name: listen.tabs.melodies(0) }).click();
  await expect(page).toHaveURL(`${ROUTES.listen}?tab=melodies`);
  await expect(pause(page)).toBeVisible();

  // Saving asks for a name; Escape closes the dialog without stopping the music.
  await stage(page).getByRole('button', { name: listen.player.save }).click();
  await expect(page.getByRole('dialog', { name: listen.save.title })).toBeVisible();
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(page.getByRole('dialog', { name: listen.save.title })).toBeHidden();
  await expect(pause(page)).toBeVisible();
  await stage(page).getByRole('button', { name: listen.player.save }).click();
  await page.getByLabel(listen.save.nameLabel).fill('Mi costa');
  await page.getByRole('button', { name: listen.save.confirm, exact: true }).click();
  await expect(stage(page).locator('.listen-saved')).toHaveText(new RegExp(listen.player.saved));
  await expect(page.getByRole('heading', { level: 3, name: 'Mi costa' })).toBeVisible();

  // Escape pauses, from anywhere on the screen (ADR-16).
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(stage(page).getByRole('button', { name: listen.player.resume, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a saved melody plays from its start, its time bar jumps, and leaving pauses it where it was (ADR-67)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(ROUTES.listen);
  await acceptWarnings(page);
  await storeMelody(page);

  // A link that names a melody brings it into sight without playing it.
  await page.goto(`${ROUTES.listen}?tab=melodies&melody=${SAVED_ID}`);
  const card = page.locator('.melody-card', { hasText: 'Costa de prueba' });
  await expect(card).toBeFocused();
  await expect(card.getByText(/30 min/)).toBeVisible();
  await expect(pause(page)).toHaveCount(0);

  await card.getByRole('button', { name: listen.melodies.playNamed('Costa de prueba') }).click();
  await expect(pause(page)).toBeVisible();
  await expect(player(page).getByRole('button', { name: /Costa de prueba/ })).toHaveAttribute('aria-current', 'true');

  // The bar is a slider: a key jumps a minute ahead, and the piece plays from there.
  const bar = page.getByRole('slider', { name: listen.player.seekLabel });
  await expect(bar).toHaveAttribute('max', '1800');
  await bar.focus();
  await page.keyboard.press('PageUp');
  await expect(pause(page)).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuetext', /^01:0\d de 30:00$/);

  // Going elsewhere stops it; coming back finds it paused at the same moment, ready to resume.
  await page.getByRole('button', { name: listen.player.collapse }).click();
  await page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: es.app.navigation.history }).click();
  await expect(page.getByRole('heading', { level: 1, name: es.history.title })).toBeVisible();
  await page.getByRole('navigation', { name: es.app.mainNavigation }).getByRole('link', { name: es.app.navigation.listen }).click();
  await expect(stage(page).getByText(listen.player.phases.paused)).toBeVisible();
  await expect(page.getByRole('slider', { name: listen.player.seekLabel })).toHaveAttribute('aria-valuetext', /^01:0\d de 30:00$/);
  await stage(page).getByRole('button', { name: listen.player.resume, exact: true }).click();
  await expect(pause(page)).toBeVisible();

  // Deleting the melody while it is held keeps the piece, now unsaved.
  await pause(page).click();
  await page.getByRole('link', { name: listen.tabs.melodies(1) }).click();
  await page.locator('.melody-card').getByLabel(listen.melodies.more('Costa de prueba')).click();
  await page.getByRole('button', { name: listen.melodies.delete }).click();
  await page.getByRole('button', { name: listen.melodies.deleteConfirm }).click();
  await expect(page.getByText(listen.melodies.empty)).toBeVisible();
  await expect(stage(page).getByText(listen.player.unsaved)).toBeVisible();
  await expect(stage(page).getByRole('button', { name: listen.player.save })).toBeVisible();
  expect(errors).toEqual([]);
});

test('on a phone a bar at the bottom opens the player over the screen, and Back closes it (ADR-67)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTES.listen);
  await acceptWarnings(page);
  const mini = page.locator('.player-mini');
  await expect(mini.getByRole('button', { name: listen.player.play, exact: true })).toBeInViewport();

  await mini.getByRole('button', { name: listen.player.play, exact: true }).click();
  await expect(pause(page)).toBeInViewport();
  await expect(page.getByRole('slider', { name: listen.player.seekLabel })).toBeInViewport();

  await page.goBack();
  await expect(mini.getByRole('button', { name: listen.player.pause, exact: true })).toBeInViewport();
  await mini.getByRole('button', { name: listen.player.expand }).click();
  await expect(pause(page)).toBeInViewport();
  await pause(page).click();
  await expect(stage(page).getByRole('button', { name: listen.player.resume, exact: true })).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
