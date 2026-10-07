import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

for (const width of [360, 768, 1280]) {
  test(`existing screens remain readable and operable at ${String(width)}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const [route, title] of [
      ['/', 'NeuroMelody'],
      ['/plan', 'Plan de sesión'],
      ['/warnings', 'Antes de empezar'],
      ['/diagnostics', 'Diagnóstico de la plataforma'],
    ] as const) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route === '/' ? 'home' : route.slice(1)}.png`), fullPage: true });
    }

    await page.goto('/session');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
    const stop = page.getByRole('button', { name: 'Detener', exact: true });
    await expect(stop).toBeVisible();
    await expect(stop).toBeDisabled();
    await expect(page.getByText('Confianza no calibrada · reglas provisionales')).toBeVisible();
    await expect(page.getByTestId('activation-state')).toHaveText('Calibrando: no hay datos suficientes');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.screenshot({ path: testInfo.outputPath('session-empty.png'), fullPage: true });
    await page.getByRole('combobox', { name: 'Velocidad', exact: true }).selectOption('10');
    await page.getByRole('button', { name: 'Conectar simulador' }).click();
    await page.getByRole('button', { name: 'Iniciar música' }).click();
    await expect(stop).toBeEnabled();
    await page.getByText('Detalles técnicos', { exact: true }).click();
    await expect(page.getByTestId('rmssd')).not.toHaveText('—', { timeout: 15_000 });
    await page.getByTestId('discarded-beats').scrollIntoViewIfNeeded();
    await expect(stop).toBeInViewport();
    expect(await stop.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('session-connected.png'), fullPage: true });
    await page.getByRole('slider', { name: 'Volumen' }).focus();
    await page.keyboard.press('Tab');
    await expect(stop).toBeFocused();
    expect(await stop.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    expect(await stop.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
    await page.keyboard.press('Escape');
    await expect(stop).toBeDisabled();
    await expect(page.getByText('Detenida', { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

test('loading and error messages remain usable on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 900 });
  let releaseRequest: () => void = () => undefined;
  const pendingRequest = new Promise<void>(resolve => { releaseRequest = resolve; });
  await page.route('**/recordings/nsr001.json', async route => {
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
  await page.goto('/session');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('combobox', { name: 'Origen de la señal', exact: true }).selectOption('recording');
  await page.getByRole('button', { name: 'Reproducir registro' }).click();
  await expect(page.getByRole('combobox', { name: 'Registro', exact: true })).toBeDisabled();
  await expect(page.getByText('Conectando…', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('recording-loading.png'), fullPage: true });
  releaseRequest();
  await expect(page.getByRole('alert')).toContainText('No se pudo reproducir el registro');
  await expect(page.getByRole('combobox', { name: 'Registro', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await expect(page.getByText('No se pudo iniciar el audio', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('session-errors.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Detener', exact: true })).toBeInViewport();
});
