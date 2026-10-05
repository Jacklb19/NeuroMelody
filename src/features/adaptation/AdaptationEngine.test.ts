import { describe, expect, it } from 'vitest';
import { AdaptationEngine, estimateState } from './AdaptationEngine';
import { SignalProcessor, type IndicesResult } from '../signal/processing/SignalProcessor';
import { createRrGenerator } from '../acquisition/simulator/rrGenerator';
import { SCENARIOS } from '../acquisition/simulator/scenarios';

function reading(timeMs: number, meanHr = 100, rmssd = 50, quality: IndicesResult['quality'] = 'good'): IndicesResult {
  return { timeMs, meanHr, rmssd, quality, sdnn: 50, nnDurationMs: timeMs,
    coverageMs: timeMs, acceptedBeats: 100, discardedBeats: 0 };
}
function calibrated(): AdaptationEngine {
  const engine = new AdaptationEngine();
  engine.start(0, 'intermediate');
  for (let ms = 60_000; ms <= 180_000; ms += 5000) engine.process(reading(ms), ms / 1000, true);
  return engine;
}

describe('provisional state estimation', () => {
  it('includes the approved boundaries and requires both signals', () => {
    expect(estimateState(110, 40, 100, 50)).toBe('high');
    expect(estimateState(90, 60, 100, 50)).toBe('low');
    expect(estimateState(110, 50, 100, 50)).toBe('uncertain');
    expect(estimateState(100, 40, 100, 50)).toBe('uncertain');
    expect(estimateState(100, 50, 100, 50)).toBe('uncertain');
  });
  it('continues calibration beyond three minutes until twelve valid readings exist', () => {
    const engine = new AdaptationEngine();
    for (let n = 0; n < 11; n++) engine.process(reading(180_000 + n * 5000), 500, true);
    expect(engine.snapshot.calibrated).toBe(false);
    expect(engine.snapshot.level).toBe('intermediate');
    engine.process(reading(235_000), 501, true);
    expect(engine.snapshot.calibrated).toBe(true);
    expect(engine.snapshot.baselineReadings).toBe(12);
  });
  it('excludes missing, nonpositive, nonfinite and low quality indices from the baseline', () => {
    const engine = new AdaptationEngine();
    engine.process({ ...reading(180_000), meanHr: null }, 0, true);
    engine.process(reading(185_000, 100, 0), 0, true);
    engine.process(reading(190_000, NaN), 0, true);
    engine.process(reading(195_000, 100, 50, 'low'), 0, true);
    engine.process(reading(200_000, -1), 0, true);
    expect(engine.snapshot.baselineReadings).toBe(0);
  });
});

describe('guidance and hysteresis', () => {
  it('advances on Uncertain after the dwell, never before, using audio rather than signal time', () => {
    const engine = calibrated();
    engine.process(reading(185_000), 179, true);
    expect(engine.process(reading(190_000), 179.9, true)).toBeNull();
    expect(engine.snapshot.state).toBe('uncertain');
    expect(engine.process(reading(1_900_000), 180, true)).toBe('target');
  });
  it('a High in the last three estimates blocks forward guidance', () => {
    const engine = calibrated();
    engine.process(reading(185_000), 170, true);
    engine.process(reading(190_000), 171, true);
    expect(engine.process(reading(195_000, 120, 30), 180, true)).toBeNull();
    expect(engine.process(reading(200_000), 181, true)).toBeNull();
    expect(engine.process(reading(205_000), 182, true)).toBeNull();
    expect(engine.process(reading(210_000), 183, true)).toBe('target');
  });
  it('accepts High on the third estimate and reverses immediately during dwell', () => {
    const engine = calibrated();
    engine.process(reading(185_000), 180, true);
    expect(engine.process(reading(190_000), 180, true)).toBe('target');
    expect(engine.process(reading(195_000, 120, 30), 181, true)).toBeNull();
    expect(engine.process(reading(200_000, 120, 30), 182, true)).toBeNull();
    expect(engine.process(reading(205_000, 120, 30), 183, true)).toBe('intermediate');
    expect(engine.snapshot.state).toBe('high');
    expect(engine.process(reading(210_000), 362, true)).toBeNull();
  });
  it('bad quality breaks High nominations and blocks music until three fresh good readings', () => {
    const engine = calibrated();
    engine.process(reading(185_000, 120, 30), 200, true);
    engine.process(reading(190_000, 120, 30), 201, true);
    engine.process(reading(195_000, 120, 30, 'low'), 202, true);
    expect(engine.process(reading(200_000, 120, 30), 203, true)).toBeNull();
    expect(engine.process(reading(205_000, 120, 30), 204, true)).toBeNull();
    expect(engine.process(reading(210_000, 120, 30), 205, true)).toBe('high');
    for (let ms = 215_000; ms <= 225_000; ms += 5000) {
      expect(engine.process(reading(ms, 100, 50, 'low'), 1000, true)).toBeNull();
    }
    expect(engine.snapshot.state).toBe('uncertain');
  });
  it('ignores duplicate and out of order readings and invalidates on loss of source', () => {
    const engine = calibrated();
    engine.process(reading(185_000, 120, 30), 181, true);
    engine.process(reading(185_000, 120, 30), 182, true);
    engine.process(reading(175_000, 120, 30), 183, true);
    engine.invalidate();
    expect(engine.process(reading(190_000, 120, 30), 184, true)).toBeNull();
    expect(engine.snapshot.state).toBeNull();
  });
  it('does not queue obsolete High estimates while music is stopped', () => {
    const engine = calibrated();
    for (let ms = 185_000; ms <= 195_000; ms += 5000) engine.process(reading(ms, 120, 30), 0, false);
    engine.start(10, 'intermediate');
    for (let ms = 200_000; ms <= 210_000; ms += 5000) engine.process(reading(ms), 11, true);
    expect(engine.snapshot.level).toBe('intermediate');
    expect(engine.snapshot.state).toBe('uncertain');
  });
  it('requires fresh hysteresis on resume even if High was previously accepted', () => {
    const engine = calibrated();
    for (let ms = 185_000; ms <= 195_000; ms += 5000) engine.process(reading(ms, 120, 30), 0, false);
    engine.start(1, 'intermediate');
    expect(engine.process(reading(200_000, 120, 30), 2, true)).toBeNull();
    expect(engine.process(reading(205_000, 120, 30), 3, true)).toBeNull();
    expect(engine.process(reading(210_000, 120, 30), 4, true)).toBe('high');
  });
});

describe('closed loop with reproducible signal processing', () => {
  it.each(['progressive_activation', 'progressive_relaxation'] as const)('%s reaches the corresponding state from RR data', (scenario) => {
    const engine = new AdaptationEngine();
    engine.start(0, 'intermediate');
    const states = new Set<string>();
    const processor = new SignalProcessor(result => {
      engine.process(result, result.timeMs / 1000, true);
      if (engine.snapshot.state !== null) states.add(engine.snapshot.state);
    });
    const generator = createRrGenerator(SCENARIOS[scenario], 1);
    for (let beat = generator.next(); beat.endMs < 900_000; beat = generator.next()) {
      processor.process({ timeMs: beat.endMs, rrIntervalsMs: [beat.rrMs], heartRate: 60000 / beat.rrMs, sensorContact: true });
    }
    expect(states.has(scenario === 'progressive_activation' ? 'high' : 'low')).toBe(true);
  });
});
