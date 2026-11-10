import { expect, test } from './fixtures';
import { ROUTES } from '../src/config/routes';
import { es } from '../src/i18n/es';
import { sessionRecord } from '../src/test/sessionRecords';
import { BACKUP_FORMAT, BACKUP_VERSION, parseListeningBackup } from '../src/features/records/listeningBackup';
import { readFile } from 'node:fs/promises';

const copy = es.listeningTools;
const owner = 'e2e-user';

test('opens the first-session guide and uses a saved sound plan in playback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto(ROUTES.app);
  await page.getByRole('link', { name: copy.guide }).click();
  await page.getByLabel(copy.mode).selectOption('fixed');
  await page.getByLabel(copy.profile).selectOption('minimal');
  await page.getByRole('radio', { name: es.plan.ambience.names.rain, exact: true }).check();
  await page.getByText(copy.favorites, { exact: true }).click();
  await page.getByLabel(copy.favoriteName).fill('Mi pausa');
  await page.getByRole('button', { name: copy.saveFavorite }).click();
  await expect(page.getByText(copy.savedFavorite)).toBeVisible();
  await page.reload();
  await page.getByText(copy.favorites, { exact: true }).click();
  await page.getByRole('button', { name: `${copy.useFavorite}: Mi pausa` }).click();
  await expect(page.getByLabel(copy.mode)).toHaveValue('fixed');
  await expect(page.getByLabel(copy.profile)).toHaveValue('minimal');
  await expect(page.getByRole('radio', { name: es.plan.ambience.names.rain, exact: true })).toBeChecked();
  await page.getByRole('button', { name: copy.preview, exact: true }).click();
  await expect(page.getByRole('button', { name: copy.previewStop })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.preview, exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(copy.previewFailed)).toHaveCount(0);
  await page.getByRole('button', { name: es.plan.continueToSession }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await expect(page.getByText(copy.guideSteps[0] ?? '')).toBeVisible();
  await page.getByRole('button', { name: es.session.slides.withoutPulse }).click();
  await page.getByRole('button', { name: es.audio.playback.start }).click();
  await expect(page.getByRole('heading', { name: copy.fixed })).toBeVisible();
  const ambience = page.getByRole('slider', { name: copy.ambienceMix });
  await ambience.fill('0');
  await expect(ambience).toHaveValue('0');
  await expect(page.getByRole('slider', { name: copy.musicMix })).toHaveValue('100');
  await page.keyboard.press('Escape');
  await expect(page.getByText(es.audio.playback.states.stopped, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('restores and exports a backup without overwriting an existing note, then filters its sessions', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const now = new Date().toISOString();
  const noted = sessionRecord({ ownerId: owner, startedAt: now, endedAt: now, goals: ['relax'], note: 'Nota original' });
  const other = sessionRecord({ id: '019a0000-0000-7000-8000-000000000003', ownerId: owner, startedAt: now, endedAt: now, goals: ['pause'] });
  await page.goto(ROUTES.account);
  async function restore(records: typeof noted[]): Promise<void> {
    await page.getByLabel(copy.selectBackup).setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, owner, sessions: records, favorites: [] })),
    });
    await page.getByRole('button', { name: copy.importBackup }).click();
    await expect(page.getByText(copy.backupDone)).toBeVisible();
  }
  await restore([noted, other]);
  await restore([{ ...noted, note: 'Nota anterior' }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: copy.exportBackup }).click();
  const exported = parseListeningBackup(await readFile(await (await download).path(), 'utf8'), owner);
  expect(exported.sessions).toHaveLength(2);
  expect(exported.sessions.find((record) => record.id === noted.id)?.note).toBe('Nota original');
  await page.goto(ROUTES.history);
  await expect(page.getByRole('heading', { name: copy.week })).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.getByRole('checkbox', { name: copy.withNotes }).check();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.getByLabel(copy.goal).selectOption('pause');
  await expect(page.getByText(copy.noMatches)).toBeVisible();
  await page.getByRole('button', { name: copy.clearFilters }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.getByLabel(copy.from).fill('2099-01-01');
  await expect(page.getByText(copy.noMatches)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
