import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACTIVATION_STATE_IDS } from '../activationStates';
import { AdaptationEngine } from '../AdaptationEngine';
import { CALIBRATION_MS, HYSTERESIS_ESTIMATES, MIN_BASELINE_READINGS } from '../rules';
import type { IndicesResult } from '../../signal/processing/SignalProcessor';
import { COMPUTE_PERIOD_MS } from '../../signal/processing/thresholds';
import { parseActivationModel, predictActivation, type ActivationModel } from './activationModel';

const MODEL_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'public', 'models', 'activation-classifier.json');
const shipped: unknown = JSON.parse(readFileSync(MODEL_FILE, 'utf8'));

function shippedModel(): ActivationModel {
  const model = parseActivationModel(shipped);
  if (model === null) throw new Error('The shipped model does not pass its own validation.');
  return model;
}

const BASELINE = { meanHr: 70, rmssd: 35, sdnn: 40 };

describe('activation classifier', () => {
  // Reference values computed with numpy and scipy from the same file (back/training).
  it.each([
    [{ meanHr: 84, rmssd: 20, sdnn: 30 }, 'high', 0.5409],
    [{ meanHr: 62, rmssd: 48, sdnn: 52 }, 'low', 0.6449],
    [BASELINE, 'uncertain', 0.443],
  ] as const)('predicts like the training code for %o', (reading, state, confidence) => {
    const prediction = predictActivation(shippedModel(), reading, BASELINE);
    expect(prediction?.state).toBe(state);
    expect(prediction?.confidence).toBeCloseTo(confidence, 3);
  });

  it('covers every state of the app exactly once', () => {
    expect([...shippedModel().classes].sort()).toEqual([...ACTIVATION_STATE_IDS].sort());
  });

  it('rejects a file it cannot trust and gives no estimate without a usable baseline', () => {
    const file = shipped as Record<string, unknown>;
    expect(parseActivationModel({ ...file, schemaVersion: 2 })).toBeNull();
    expect(parseActivationModel({ ...file, features: ['other'] })).toBeNull();
    expect(parseActivationModel({ ...file, bias: [0, Number.NaN, 0] })).toBeNull();
    expect(parseActivationModel({ ...file, temperature: 0 })).toBeNull();
    expect(predictActivation(shippedModel(), BASELINE, { ...BASELINE, sdnn: 0 })).toBeNull();
  });
});

describe('AdaptationEngine with the trained model', () => {
  const reading = (index: number, values: typeof BASELINE): IndicesResult => ({
    timeMs: (index + 1) * COMPUTE_PERIOD_MS,
    ...values,
    nnDurationMs: 120_000,
    coverageMs: 120_000,
    acceptedBeats: 120,
    discardedBeats: 0,
    quality: 'good',
    lfPower: null,
    hfPower: null,
    lfHfRatio: null,
  });

  it('accepts the model\'s state with its confidence, and falls back to the rules without a model', () => {
    const calibrationReadings = Math.max(MIN_BASELINE_READINGS, CALIBRATION_MS / COMPUTE_PERIOD_MS);
    for (const model of [shippedModel(), null]) {
      const engine = new AdaptationEngine(model);
      let index = 0;
      for (; index < calibrationReadings; index++) engine.process(reading(index, BASELINE), 0, false);
      for (let i = 0; i < HYSTERESIS_ESTIMATES; i++) engine.process(reading(index++, { meanHr: 84, rmssd: 20, sdnn: 30 }), 0, false);

      expect(engine.snapshot.state).toBe('high');
      expect(engine.snapshot.estimator).toBe(model === null ? 'rules' : 'model');
      if (model === null) expect(engine.snapshot.confidence).toBeNull();
      else expect(engine.snapshot.confidence).toBeCloseTo(0.5409, 3);
    }
  });
});
