import { expect, test } from '@playwright/test';

const durationS = process.env.AUDIO_LONG === '1' ? 1800 : 60;

test(`plays for ${String(durationS)} seconds without underruns (RNF-01)`, async ({ page, browser }, testInfo) => {
  test.setTimeout((durationS + 45) * 1000);
  // Inspect the actual context without adding a test API to the product.
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    class ObservedContext extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        Object.defineProperty(window, '__audioContext', { value: this, configurable: true });
      }
    }
    window.AudioContext = ObservedContext;
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/session?duration=60');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('button', { name: 'Conectar simulador' }).click();
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await expect(page.getByText('Sonando', { exact: true })).toBeVisible();

  const readStats = () => page.evaluate(() => {
    const candidate: unknown = Reflect.get(window, '__audioContext');
    if (!(candidate instanceof AudioContext)) throw new Error('No audio context was created');
    const raw: unknown = Reflect.get(candidate, 'playbackStats');
    if (typeof raw !== 'object' || raw === null) throw new Error('playbackStats is unavailable; RNF-01 cannot be verified');
    const underruns: unknown = Reflect.get(raw, 'underrunEvents');
    const underrunDuration: unknown = Reflect.get(raw, 'underrunDuration');
    const totalDuration: unknown = Reflect.get(raw, 'totalDuration');
    if (typeof underruns !== 'number' || typeof underrunDuration !== 'number' || typeof totalDuration !== 'number') {
      throw new Error('Invalid playbackStats');
    }
    return { underruns, underrunDuration, totalDuration, audioTime: candidate.currentTime, state: candidate.state };
  });
  const initial = await readStats();
  expect(initial.underruns).toBe(0);
  const samples = [initial];
  const start = Date.now();
  try {
    while (Date.now() - start < durationS * 1000) {
      await page.waitForTimeout(Math.min(10_000, durationS * 1000 - (Date.now() - start)));
      const sample = await readStats();
      samples.push(sample);
      expect(sample.state).toBe('running');
      expect(sample.underruns).toBe(0);
      expect(sample.underrunDuration).toBe(0);
    }
    const final = await readStats();
    expect(final.totalDuration - initial.totalDuration).toBeGreaterThanOrEqual(durationS - 2);
    expect(final.audioTime - initial.audioTime).toBeGreaterThanOrEqual(durationS - 2);
    expect(errors).toEqual([]);
  } finally {
    // Preserve the last measurement even if an underrun or an assertion stops the test.
    await testInfo.attach('audio-continuity.json', { body: JSON.stringify({
      browser: testInfo.project.name, browserVersion: browser.version(), durationS,
      startedAt: new Date(start).toISOString(), finishedAt: new Date().toISOString(),
      initial, final: samples.at(-1), samples, errors,
    }, null, 2), contentType: 'application/json' });
  }
  await page.getByRole('button', { name: 'Detener', exact: true }).click();
  await expect(page.getByText('Detenida', { exact: true })).toBeVisible();
});
