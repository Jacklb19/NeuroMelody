import { expect, test, type Page } from '@playwright/test';
import { ROUTES, summaryPath } from '../src/config/routes';
import { es } from '../src/i18n/es';
import { en } from '../src/i18n/en';
import { sessionRecord, sample } from '../src/test/sessionRecords';
import type { SessionRecord } from '../src/features/records/sessionRecord';

test.use({ serviceWorkers: 'block' });

const RECORDS = Array.from({ length: 10 }, (_, index) => sessionRecord({
  id: `019a0000-0000-7000-8000-${String(index).padStart(12, '0')}`,
  startedAt: `2026-10-${String(10 + index).padStart(2, '0')}T15:00:00.000Z`,
  endedAt: `2026-10-${String(10 + index).padStart(2, '0')}T15:30:00.000Z`,
  goals: ['relax'], plannedMinutes: index < 5 ? 30 : 10, listenedSeconds: index < 5 ? 1800 : 600,
  ratingBefore: 4, ratingAfter: index < 5 ? 7 : 5,
  context: { version: 1, instrument: index < 5 ? 'piano' : 'warm', ambience: index < 5 ? 'rain' : 'none', localHour: index < 5 ? 10 : 19, localDate: `2026-10-${String(10 + index).padStart(2, '0')}` },
  samples: [sample(5, { meanHr: 80 }), sample(10, { meanHr: 70 })],
}));

async function seed(page: Page, records: readonly SessionRecord[]): Promise<void> {
  await page.evaluate((items) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('neuromelody', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('sessions', { keyPath: 'id' }); };
    request.onerror = () => { reject(new Error('Could not open test history')); };
    request.onsuccess = () => {
      const transaction = request.result.transaction('sessions', 'readwrite');
      for (const record of items) transaction.objectStore('sessions').put(record);
      transaction.oncomplete = () => { request.result.close(); resolve(); };
      transaction.onabort = () => { reject(new Error('Could not seed test history')); };
    };
  }), records);
}

for (const locale of ['es', 'en'] as const) for (const theme of ['light', 'dark'] as const) for (const width of [390, 1280]) {
  test(`local comparisons, personal choices and notes at ${String(width)}px ${theme} ${locale}`, async ({ page }, testInfo) => {
    const t = locale === 'es' ? es : en;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(({ language, appearance }) => {
      localStorage.setItem('neuromelody.locale', language);
      localStorage.setItem('neuromelody.theme', appearance);
    }, { language: locale, appearance: theme });
    await page.goto(ROUTES.app);
    await seed(page, RECORDS);
    await page.goto(ROUTES.progress);
    const panel = page.getByRole('region', { name: t.insights.title, exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.locator('.insight-observations > li')).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath('progress.png'), fullPage: true });
    await page.getByRole('button', { name: t.progress.range.last(7), exact: true }).click();
    await expect(panel.getByText(t.insights.empty(5))).toBeVisible();
    await page.getByRole('button', { name: t.progress.range.all, exact: true }).click();
    await expect(panel.locator('.insight-observations > li')).toHaveCount(3);
    await panel.getByText(t.insights.methodTitle, { exact: true }).click();
    await expect(panel.getByRole('table')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto(`${ROUTES.plan}?goals=relax`);
    await page.getByRole('button', { name: t.insights.forYou.accept, exact: true }).click();
    await expect(page.getByRole('radio', { name: t.plan.instrument.names.piano, exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: t.plan.ambience.names.rain, exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: t.plan.minutes(30), exact: true })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('plan.png'), fullPage: true });
    await page.getByRole('button', { name: t.plan.continueToSession }).click();
    await expect(page.getByRole('heading', { name: t.warnings.pageTitle, exact: true })).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: t.warnings.accept }).click();
    await expect(page).toHaveURL(/duration=30/);
    await expect(page).toHaveURL(/instrument=piano/);
    await expect(page).toHaveURL(/ambience=rain/);

    const id = RECORDS[0]?.id ?? '';
    await page.goto(summaryPath(id));
    const note = page.getByRole('textbox', { name: t.insights.note.label, exact: true });
    await note.fill('A moment for myself');
    await page.getByRole('button', { name: t.insights.note.save, exact: true }).click();
    await expect(page.getByText(t.insights.note.saved, { exact: true })).toBeVisible();
    await page.reload();
    await expect(note).toHaveValue('A moment for myself');
    await page.screenshot({ path: testInfo.outputPath('note.png'), fullPage: true });
    await page.getByRole('button', { name: t.insights.note.remove, exact: true }).click();
    await expect(note).toHaveValue('');
    await expect(page.getByText(t.insights.note.removed, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('quick session keeps the last choices, warnings and manual playback', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('neuromelody.goals', 'relax');
    localStorage.setItem('neuromelody.instrument', 'piano');
    localStorage.setItem('neuromelody.ambience', 'rain');
  });
  await page.goto(ROUTES.app);
  await page.getByRole('link', { name: es.insights.quick.action, exact: true }).click();
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle, exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await expect(page).toHaveURL(/duration=3/);
  await expect(page).toHaveURL(/instrument=piano/);
  await expect(page).toHaveURL(/ambience=rain/);
  await expect(page.getByText(es.insights.quick.calibration, { exact: true })).toBeVisible();
  const stop = page.getByRole('button', { name: es.audio.playback.stop, exact: true });
  await expect(stop).toBeDisabled();
  await page.getByRole('button', { name: es.session.slides.withoutPulse }).click();
  await page.getByRole('button', { name: es.audio.playback.start, exact: true }).click();
  await expect(stop).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(stop).toBeDisabled();
});
