import type { AudioEngine } from '../audio/engine/AudioEngine';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import {
  AdaptationEngine,
  DEFAULT_GUIDANCE_RANGE,
  type AdaptationSnapshot,
  type GuidanceRange,
  type TransitionTiming,
} from './AdaptationEngine';
import type { ActivationModel } from './classifier/activationModel';
import type { LevelId } from '../audio/engine/levels';

export interface SessionSnapshot extends AdaptationSnapshot {
  readonly tempoBpm: number | null;
}

/** Binds guidance to the existing audio engine; no musical timers or extra worker. */
export class AdaptationSession {
  readonly #range: GuidanceRange;
  #model: ActivationModel | null = null;
  #guidance: AdaptationEngine;
  #audio: AudioEngine | null = null;
  #lastTiming: TransitionTiming | null = null;
  #snapshot: SessionSnapshot;
  readonly #listeners = new Set<() => void>();

  /** `range` is the stretch of the ladder the program of the session allows (ADR-38). */
  constructor(range: GuidanceRange = DEFAULT_GUIDANCE_RANGE) {
    this.#range = range;
    this.#guidance = new AdaptationEngine(null, range);
    this.#snapshot = { ...this.#guidance.snapshot, tempoBpm: null };
  }

  getSnapshot = (): SessionSnapshot => this.#snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  setAudio = (audio: AudioEngine | null): void => {
    this.#audio = audio;
    if (audio !== null) this.#guidance.start(audio.audioTime, audio.level);
    else this.#guidance.invalidate();
    this.#publish();
  };

  /** Gives the session the trained classifier once it has loaded; `null` goes back to the rules. */
  setModel = (model: ActivationModel | null): void => {
    this.#model = model;
    this.#guidance.setModel(model);
    this.#publish();
  };

  reset = (): void => {
    this.#guidance = new AdaptationEngine(this.#model, this.#range);
    this.#lastTiming = null;
    if (this.#audio !== null) {
      const { startLevel } = this.#range;
      if (this.#audio.level !== startLevel) this.#audio.applyLevel(startLevel);
      this.#guidance.start(this.#audio.audioTime, startLevel);
    }
    this.#publish();
  };

  invalidate = (): void => {
    if (this.#guidance.snapshot.qualityGood) this.#guidance.invalidate();
    this.#publish();
  };

  receive = (result: IndicesResult): void => {
    const audio = this.#audio;
    const level = this.#guidance.process(result, audio?.audioTime ?? 0, audio?.state === 'playing');
    if (level !== null && audio !== null) this.#apply(audio, level);
    this.#publish();
  };

  /** Source cadence checks eligibility; AudioParam still owns every sound ramp. */
  pulse = (): void => {
    const audio = this.#audio;
    if (audio === null) return;
    const level = this.#guidance.advance(audio.audioTime, audio.state === 'playing');
    if (level !== null) this.#apply(audio, level);
    this.#publish();
  };

  #publish(): void {
    this.#snapshot = { ...this.#guidance.snapshot, tempoBpm: this.#audio?.tempoBpm ?? null,
      waitingForDwell: this.#audio?.state === 'playing' && this.#guidance.snapshot.waitingForDwell,
      lastTransition: this.#lastTiming };
    for (const listener of this.#listeners) listener();
  }

  #apply(audio: AudioEngine, level: LevelId): void {
    audio.applyLevel(level);
    const timing = this.#guidance.snapshot.lastTransition;
    // Sampling after scheduling gives a conservative upper bound on control latency.
    if (timing !== null) this.#lastTiming = { ...timing, scheduledAtS: audio.audioTime };
  }
}
