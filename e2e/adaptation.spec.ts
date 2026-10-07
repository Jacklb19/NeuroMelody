import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type TestInfo } from '@playwright/test';
import { ROUTES } from '../src/config/routes';
import type { ScenarioId } from '../src/features/acquisition/simulator/scenarios';
import type { Speed } from '../src/features/acquisition/speedCatalog';
import {
  CALIBRATION_MS,
  HEART_RATE_CHANGE,
  HYSTERESIS_ESTIMATES,
  MIN_BASELINE_READINGS,
  MIN_LEVEL_DURATION_S,
  RMSSD_CHANGE,
} from '../src/features/adaptation/rules';
import { LEVEL_IDS, LEVELS } from '../src/features/audio/engine/levels';
import { MIN_TEMPO_RAMP_S, SECONDS_PER_BPM } from '../src/features/audio/engine/ramps';
import { STOP_SHORTCUT_KEY } from '../src/features/audio/ui/stopShortcut';
import { COMPUTE_PERIOD_MS } from '../src/features/signal/processing/thresholds';
import type { SignalQuality } from '../src/features/signal/processing/types';
import { es } from '../src/i18n/es';
import { MS_PER_SECOND } from '../src/shared/time';

interface Ramp { readonly from: number; readonly to: number; readonly start: number; readonly end: number; readonly requestedAt: number }
interface Signal { readonly timeMs: number; readonly meanHr: number | null; readonly rmssd: number | null; readonly quality: SignalQuality; readonly receivedAt: number; readonly audioTimeS: number | null }
interface EvidenceWindow extends Window { adaptationEvidence: { ramps: Ramp[]; signals: Signal[]; audioStartS: number | null } }

const { playback } = es.audio;
/** Signal speed-up, so calibration and the transitions fit in the timeouts below. */
const SPEED: Speed = 10;
/** Scenario whose activation rises above the baseline, to exercise the step back (ADR-12). */
const RISING_SCENARIO: ScenarioId = 'progressive_activation';
/** Bound of both adaptation latencies: from acceptance or from eligibility (RNF-02, ADR-12). */
const MAX_LATENCY_MS = 2000;
/** Slowest and fastest level tempos: only ramps within this range are tempo ramps. */
const TEMPOS = LEVEL_IDS.map(id => LEVELS[id].tempo);
const TEMPO_RANGE = { min: Math.min(...TEMPOS), max: Math.max(...TEMPOS) };
/** Signal time of the estimate that accepts a steady state: the first comes when calibration ends. */
const ACCEPTANCE_SIGNAL_MS = CALIBRATION_MS + (HYSTERESIS_ESTIMATES - 1) * COMPUTE_PERIOD_MS;

async function attachEvidence(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  const directory = 'build/verification/s4';
  await mkdir(directory, { recursive: true });
  const path = `${directory}/${testInfo.project.name}-${name}`;
  await writeFile(path, JSON.stringify(data));
  await testInfo.attach(name, { path, contentType: 'application/json' });
}

test.beforeEach(async ({ page }) => {
  // The script runs in the page, so the tempo range travels as its serialized argument.
  await page.addInitScript((tempoRange) => {
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
    const isTempo = (value: number): boolean => value >= tempoRange.min && value <= tempoRange.max;
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
      if (from !== undefined && isTempo(value) && isTempo(from.value)) {
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
  }, TEMPO_RANGE);
  await page.goto(ROUTES.session);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await page.getByLabel(es.acquisition.speedLabel).selectOption(String(SPEED));
});

test('rising activation closes the loop with native AudioParam ramps and latency under two seconds', async ({ page }, testInfo) => {
  test.setTimeout(130_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.getByLabel(es.acquisition.scenarioLabel).selectOption(RISING_SCENARIO);
  await page.getByRole('button', { name: playback.start }).click();
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await expect(page.getByTestId('activation-state')).toHaveText(es.adaptation.states.high, { timeout: 115_000 });
  await expect(page.getByTestId('music-level')).toHaveText(es.audio.levels.high);
  const evidence = await page.evaluate(() => (window as unknown as EvidenceWindow).adaptationEvidence);
  const baseline = evidence.signals.filter(s => s.timeMs <= CALIBRATION_MS && s.quality === 'good' && s.meanHr !== null && s.rmssd !== null);
  expect(baseline.length).toBeGreaterThanOrEqual(MIN_BASELINE_READINGS);
  const baseHr = baseline.reduce((sum, s) => sum + (s.meanHr ?? 0), 0) / baseline.length;
  const baseRmssd = baseline.reduce((sum, s) => sum + (s.rmssd ?? 0), 0) / baseline.length;
  let count = 0;
  let acceptedAt: number | null = null;
  for (const signal of evidence.signals.filter(s => s.timeMs >= CALIBRATION_MS)) {
    count = signal.quality === 'good' && (signal.meanHr ?? 0) / baseHr >= 1 + HEART_RATE_CHANGE
      && (signal.rmssd ?? Infinity) / baseRmssd <= 1 - RMSSD_CHANGE ? count + 1 : 0;
    if (count === HYSTERESIS_ESTIMATES) { acceptedAt = signal.receivedAt; break; }
  }
  expect(acceptedAt).not.toBeNull();
  const high = evidence.ramps.find(r => r.to === LEVELS.high.tempo);
  expect(high).toBeDefined();
  if (high === undefined || acceptedAt === null) throw new Error('Missing native transition evidence');
  expect(high.end - high.start).toBeGreaterThanOrEqual(MIN_TEMPO_RAMP_S);
  expect(high.end - high.start).toBeCloseTo(Math.max(MIN_TEMPO_RAMP_S, Math.abs(LEVELS.high.tempo - high.from) * SECONDS_PER_BPM), 5);
  expect(high.requestedAt - acceptedAt).toBeGreaterThanOrEqual(0);
  expect(high.requestedAt - acceptedAt).toBeLessThan(MAX_LATENCY_MS);
  await attachEvidence(testInfo, 'native-adaptation.json', { ...evidence, sinceAcceptanceMs: high.requestedAt - acceptedAt,
    sinceEligibilityMs: high.requestedAt - acceptedAt, latencyMs: high.requestedAt - acceptedAt, errors });
  await page.keyboard.press(STOP_SHORTCUT_KEY);
  await expect(page.getByText(playback.states.stopped, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Uncertain advances only after three real minutes on the native audio clock', async ({ page }, testInfo) => {
  test.setTimeout(220_000);
  await page.getByRole('button', { name: playback.start }).click();
  await page.getByRole('button', { name: es.acquisition.connect.simulator }).click();
  await expect(page.getByTestId('activation-state')).toHaveText(es.adaptation.states.uncertain, { timeout: 30_000 });
  await expect(page.getByTestId('dwell-notice')).toBeVisible();
  await expect(page.getByTestId('music-level')).toHaveText(es.audio.levels.intermediate);
  // The step waits for the whole dwell on the audio clock, which runs in real time.
  await expect(page.getByTestId('music-level')).toHaveText(es.audio.levels.target, { timeout: MIN_LEVEL_DURATION_S * MS_PER_SECOND });
  const evidence = await page.evaluate(() => (window as unknown as EvidenceWindow).adaptationEvidence);
  const down = evidence.ramps.find(r => r.to === LEVELS.target.tempo);
  expect(down).toBeDefined();
  if (down === undefined) throw new Error('Missing native dwell evidence');
  expect(down.start).toBeGreaterThanOrEqual(MIN_LEVEL_DURATION_S);
  expect(down.end - down.start).toBeGreaterThanOrEqual(MIN_TEMPO_RAMP_S);
  const acceptedAtS = evidence.signals.find(s => s.timeMs === ACCEPTANCE_SIGNAL_MS)?.audioTimeS;
  if (acceptedAtS === undefined || acceptedAtS === null || evidence.audioStartS === null) throw new Error('Missing acceptance clock evidence');
  const eligibleAtS = evidence.audioStartS + MIN_LEVEL_DURATION_S;
  const sinceAcceptanceMs = (down.start - acceptedAtS) * MS_PER_SECOND;
  const sinceEligibilityMs = (down.start - eligibleAtS) * MS_PER_SECOND;
  expect(sinceAcceptanceMs).toBeGreaterThan(MAX_LATENCY_MS);
  expect(sinceEligibilityMs).toBeGreaterThanOrEqual(0);
  expect(sinceEligibilityMs).toBeLessThan(MAX_LATENCY_MS);
  await expect(page.getByTestId('dwell-notice')).toHaveCount(0);
  await attachEvidence(testInfo, 'native-dwell.json', { ...evidence, acceptedAtS, eligibleAtS, sinceAcceptanceMs, sinceEligibilityMs });
  await page.getByRole('button', { name: playback.stop, exact: true }).click();
});
