import { expect, it } from 'vitest';
import { AudioEngine } from '../audio/engine/AudioEngine';
import { createFakeAudioEnvironment } from '../../test/fakeAudio';
import { AdaptationSession } from './AdaptationSession';
import { FADE_DURATION_S, tempoRampDurationS } from '../audio/engine/ramps';
import type { IndicesResult } from '../signal/processing/SignalProcessor';

function reading(timeMs: number, high = false): IndicesResult {
  return { timeMs, meanHr: high ? 120 : 100, rmssd: high ? 30 : 50, sdnn: 50,
    nnDurationMs: timeMs, coverageMs: timeMs, acceptedBeats: 100, discardedBeats: 0, lfPower: null, hfPower: null, lfHfRatio: null, quality: 'good' };
}

it('performs one thousand interrupted transitions with real delta ramps and no latency after accepted High', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
  await audio.start();
  const session = new AdaptationSession();
  let publications = 0;
  const unsubscribe = session.subscribe(() => publications++);
  session.setAudio(audio);
  for (let ms = 60_000; ms <= 180_000; ms += 5000) session.receive(reading(ms));
  const tempo = env.worklets[0]?.parameters.get('tempo');
  if (tempo === undefined) throw new Error('Missing tempo');
  let signalMs = 180_000;
  let transitionCount = 0;
  for (let pair = 0; pair < 500; pair++) {
    env.context.currentTime += 180;
    const downStart = env.context.currentTime;
    for (let n = 0; n < 3; n++) { signalMs += 5000; session.receive(reading(signalMs)); }
    expect(audio.level).toBe('target');
    transitionCount++;
    // Native AudioParam.value returns the value at the audio clock; model that halfway value.
    const downRamp = tempo.last('linear');
    if (downRamp === undefined) throw new Error('Missing downward ramp');
    const downDuration = downRamp.time - downStart;
    const actual = tempo.value + (59 - tempo.value) * 0.25;
    tempo.value = actual;
    env.context.currentTime += downDuration * 0.25;
    for (let n = 0; n < 2; n++) { signalMs += 5000; session.receive(reading(signalMs, true)); }
    expect(audio.level).toBe('target');
    const acceptedAt = env.context.currentTime;
    signalMs += 5000;
    session.receive(reading(signalMs, true));
    expect(audio.level).toBe('intermediate');
    const ramp = tempo.last('linear');
    if (ramp === undefined) throw new Error('Missing return ramp');
    expect(ramp.time - acceptedAt).toBeCloseTo(tempoRampDurationS(actual, 66), 8);
    expect(tempo.last('set')?.value).toBe(actual);
    expect(tempo.last('set')?.time).toBe(acceptedAt);
    expect(ramp.time - acceptedAt).toBeGreaterThanOrEqual(20);
    expect(downDuration).toBeGreaterThanOrEqual(20);
    expect(FADE_DURATION_S).toBeGreaterThanOrEqual(20);
    tempo.value = 66;
    transitionCount++;
  }
  expect(transitionCount).toBe(1000);
  expect(publications).toBeGreaterThan(1000);
  session.invalidate();
  expect(session.getSnapshot().qualityGood).toBe(false);
  session.reset();
  expect(session.getSnapshot().calibrated).toBe(false);
  session.setAudio(null);
  unsubscribe();
});

it('uses cancelAndHoldAtTime to preserve the native ramp before an interruption', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
  const tempo = env.worklets[0]?.parameters.get('tempo');
  if (tempo === undefined) throw new Error('Missing tempo');
  const holds: number[] = [];
  Object.assign(tempo, { cancelAndHoldAtTime: (time: number) => holds.push(time) });
  env.context.currentTime = 5;
  tempo.value = 61;
  expect(audio.applyLevel('high')).toBe(30);
  expect(holds).toEqual([5]);
  expect(tempo.last('linear')).toEqual({ kind: 'linear', time: 35, value: 76 });
  expect(tempo.last('cancel')).toBeUndefined();
});

it('checks eligibility on source pulses between five-second index publications', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
  await audio.start();
  const session = new AdaptationSession();
  session.pulse();
  session.setAudio(audio);
  for (let ms = 60_000; ms <= 190_000; ms += 5000) session.receive(reading(ms));
  expect(session.getSnapshot().waitingForDwell).toBe(true);
  env.context.currentTime = 179;
  session.pulse();
  expect(audio.level).toBe('intermediate');
  env.context.currentTime = 180.5;
  session.pulse();
  expect(audio.level).toBe('target');
  const timing = session.getSnapshot().lastTransition;
  expect(timing).toEqual({ direction: 'advance', acceptedAtS: 0, eligibleAtS: 180, scheduledAtS: 180.5 });
  session.invalidate();
  session.invalidate();
  env.context.currentTime = 400;
  session.pulse();
  expect(audio.level).toBe('target');
});
