import { expect, it } from 'vitest';
import { AudioEngine } from '../audio/engine/AudioEngine';
import { createFakeAudioEnvironment } from '../../test/fakeAudio';
import { AdaptationSession } from './AdaptationSession';
import { FADE_DURATION_S, tempoRampDurationS } from '../audio/engine/ramps';
import type { IndicesResult } from '../signal/processing/SignalProcessor';

// The resting pulse equals the tempo of the starting level, so the pulse does not move the tempos
// (ADR-39) and the ramps below are the ones of the level changes alone.
function reading(timeMs: number, high = false, restingHr = 66): IndicesResult {
  return { timeMs, meanHr: high ? restingHr * 1.2 : restingHr, rmssd: high ? 30 : 50, sdnn: 50,
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

it('starts over at the first level of its program when the signal restarts (ADR-38)', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'high', outputThroughAudioElement: false });
  await audio.start();
  const session = new AdaptationSession({ startLevel: 'high', calmestLevel: 'target' });
  expect(session.getSnapshot().level).toBe('high');
  session.setAudio(audio);
  audio.applyLevel('intermediate');
  session.reset();
  expect(audio.level).toBe('high');
  expect(session.getSnapshot().level).toBe('high');
});

it('moves the starting tempo to the pulse with a gradual ramp and leaves the target tempo alone (ADR-39)', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
  await audio.start();
  const tempo = env.worklets[0]?.parameters.get('tempo');
  if (tempo === undefined) throw new Error('Missing tempo');
  const session = new AdaptationSession();
  session.setAudio(audio);
  // Two readings are not enough to trust the pulse.
  session.receive(reading(5000, false, 74));
  session.receive(reading(10_000, false, 74));
  expect(tempo.last('linear')).toBeUndefined();
  env.context.currentTime = 15;
  session.receive(reading(15_000, false, 74));
  expect(tempo.last('linear')).toEqual({ kind: 'linear', time: 15 + tempoRampDurationS(66, 74), value: 74 });
  expect(session.getSnapshot().levelTempoBpm).toBe(74);
  // A pulse far above the level moves it only as far as allowed, and the step to the target still ends at 59.
  const fast = new AdaptationSession();
  fast.setAudio(audio);
  for (let ms = 5000; ms <= 180_000; ms += 5000) fast.receive(reading(ms, false, 110));
  expect(fast.getSnapshot().levelTempoBpm).toBe(66 + 14);
  env.context.currentTime += 200;
  for (let ms = 185_000; ms <= 195_000; ms += 5000) fast.receive(reading(ms, false, 110));
  expect(audio.level).toBe('target');
  expect(tempo.last('linear')?.value).toBe(59);
});

it('keeps what the music did and hands it over when the music stops (ADR-42)', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
  await audio.start();
  const session = new AdaptationSession();
  session.setAudio(audio);
  for (let ms = 60_000; ms <= 180_000; ms += 5000) session.receive(reading(ms));
  env.context.currentTime = 200;
  for (let ms = 185_000; ms <= 195_000; ms += 5000) session.receive(reading(ms));
  expect(audio.level).toBe('target');
  // While the music plays there is no finished story to tell.
  expect(session.getSnapshot().recap).toBeNull();
  session.setAudio(null);
  expect(session.getSnapshot().recap).toEqual({
    startTempoBpm: 66,
    endTempoBpm: 66,
    steps: [{ atS: 200, level: 'target', calmer: true }],
  });
  // A new start begins a new story.
  session.setAudio(audio);
  expect(session.getSnapshot().recap).toBeNull();
});
