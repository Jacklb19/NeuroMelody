import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type TestInfo } from '@playwright/test';

interface Ramp { readonly from: number; readonly to: number; readonly start: number; readonly end: number; readonly requestedAt: number }
interface Signal { readonly timeMs: number; readonly meanHr: number | null; readonly rmssd: number | null; readonly quality: string; readonly receivedAt: number; readonly audioTimeS: number | null }
interface EvidenceWindow extends Window { adaptationEvidence: { ramps: Ramp[]; signals: Signal[]; audioStartS: number | null } }

async function attachEvidence(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  const directory = 'build/verification/s4';
  await mkdir(directory, { recursive: true });
  const path = `${directory}/${testInfo.project.name}-${name}`;
  await writeFile(path, JSON.stringify(data));
  await testInfo.attach(name, { path, contentType: 'application/json' });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as EvidenceWindow;
    target.adaptationEvidence = { ramps: [], signals: [], audioStartS: null };
    let readAudioTime: (() => number) | null = null;
    const NativeAudioContext = AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        readAudioTime = () => this.currentTime;
      }
      override async resume(): Promise<void> {
        await super.resume();
        target.adaptationEvidence.audioStartS ??= this.currentTime;
      }
    };
    const held = new WeakMap<AudioParam, { value: number; time: number }>();
    // The original methods are invoked below with their native receiver via call().
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const hold = AudioParam.prototype.cancelAndHoldAtTime;
    AudioParam.prototype.cancelAndHoldAtTime = function(time) {
      held.set(this, { value: this.value, time });
      return hold.call(this, time);
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const ramp = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function(value, end) {
      const from = held.get(this);
      if (from !== undefined && value >= 59 && value <= 76 && from.value >= 59 && from.value <= 76) {
        target.adaptationEvidence.ramps.push({ from: from.value, to: value, start: from.time, end, requestedAt: performance.now() });
      }
      return ramp.call(this, value, end);
    };
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', (event: MessageEvent<{ kind?: string; result?: Signal }>) => {
          if (event.data.kind === 'indices' && event.data.result !== undefined) {
            target.adaptationEvidence.signals.push({ ...event.data.result, receivedAt: performance.now(), audioTimeS: readAudioTime?.() ?? null });
          }
        });
      }
    };
  });
  await page.goto('/session');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByLabel('Velocidad').selectOption('10');
});

test('rising activation closes the loop with native AudioParam ramps and latency under two seconds', async ({ page }, testInfo) => {
  test.setTimeout(130_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.getByLabel('Escenario').selectOption('progressive_activation');
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await page.getByRole('button', { name: 'Conectar simulador' }).click();
  await expect(page.getByTestId('activation-state')).toHaveText('Alta', { timeout: 115_000 });
  await expect(page.getByTestId('music-level')).toHaveText('Activación alta');
  const evidence = await page.evaluate(() => (window as unknown as EvidenceWindow).adaptationEvidence);
  const baseline = evidence.signals.filter(s => s.timeMs <= 180_000 && s.quality === 'good' && s.meanHr !== null && s.rmssd !== null);
  expect(baseline.length).toBeGreaterThanOrEqual(12);
  const baseHr = baseline.reduce((sum, s) => sum + (s.meanHr ?? 0), 0) / baseline.length;
  const baseRmssd = baseline.reduce((sum, s) => sum + (s.rmssd ?? 0), 0) / baseline.length;
  let count = 0;
  let acceptedAt: number | null = null;
  for (const signal of evidence.signals.filter(s => s.timeMs >= 180_000)) {
    count = signal.quality === 'good' && (signal.meanHr ?? 0) / baseHr >= 1.1 && (signal.rmssd ?? Infinity) / baseRmssd <= 0.8 ? count + 1 : 0;
    if (count === 3) { acceptedAt = signal.receivedAt; break; }
  }
  expect(acceptedAt).not.toBeNull();
  const high = evidence.ramps.find(r => r.to === 76);
  expect(high).toBeDefined();
  if (high === undefined || acceptedAt === null) throw new Error('Missing native transition evidence');
  expect(high.end - high.start).toBeGreaterThanOrEqual(20);
  expect(high.end - high.start).toBeCloseTo(Math.max(20, Math.abs(76 - high.from) * 2), 5);
  expect(high.requestedAt - acceptedAt).toBeGreaterThanOrEqual(0);
  expect(high.requestedAt - acceptedAt).toBeLessThan(2000);
  await attachEvidence(testInfo, 'native-adaptation.json', { ...evidence, sinceAcceptanceMs: high.requestedAt - acceptedAt,
    sinceEligibilityMs: high.requestedAt - acceptedAt, latencyMs: high.requestedAt - acceptedAt, errors });
  await page.keyboard.press('Escape');
  await expect(page.getByText('Detenida', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Uncertain advances only after three real minutes on the native audio clock', async ({ page }, testInfo) => {
  test.setTimeout(220_000);
  await page.getByRole('button', { name: 'Iniciar música' }).click();
  await page.getByRole('button', { name: 'Conectar simulador' }).click();
  await expect(page.getByTestId('activation-state')).toHaveText('Incierta', { timeout: 30_000 });
  await expect(page.getByTestId('dwell-notice')).toBeVisible();
  await expect(page.getByTestId('music-level')).toHaveText('Intermedio');
  await expect(page.getByTestId('music-level')).toHaveText('Activación baja (meta)', { timeout: 180_000 });
  const evidence = await page.evaluate(() => (window as unknown as EvidenceWindow).adaptationEvidence);
  const down = evidence.ramps.find(r => r.to === 59);
  expect(down).toBeDefined();
  if (down === undefined) throw new Error('Missing native dwell evidence');
  expect(down.start).toBeGreaterThanOrEqual(180);
  expect(down.end - down.start).toBeGreaterThanOrEqual(20);
  const acceptedAtS = evidence.signals.find(s => s.timeMs === 190_000)?.audioTimeS;
  if (acceptedAtS === undefined || acceptedAtS === null || evidence.audioStartS === null) throw new Error('Missing acceptance clock evidence');
  const eligibleAtS = evidence.audioStartS + 180;
  const sinceAcceptanceMs = (down.start - acceptedAtS) * 1000;
  const sinceEligibilityMs = (down.start - eligibleAtS) * 1000;
  expect(sinceAcceptanceMs).toBeGreaterThan(2000);
  expect(sinceEligibilityMs).toBeGreaterThanOrEqual(0);
  expect(sinceEligibilityMs).toBeLessThan(2000);
  await expect(page.getByTestId('dwell-notice')).toHaveCount(0);
  await attachEvidence(testInfo, 'native-dwell.json', { ...evidence, acceptedAtS, eligibleAtS, sinceAcceptanceMs, sinceEligibilityMs });
  await page.getByRole('button', { name: 'Detener', exact: true }).click();
});
