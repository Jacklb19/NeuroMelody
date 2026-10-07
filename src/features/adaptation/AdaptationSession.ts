import type { AudioEngine } from '../audio/engine/AudioEngine';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { AdaptationEngine, type AdaptationSnapshot, type TransitionTiming } from './AdaptationEngine';
import { CALIBRATION_LEVEL, type LevelId } from '../audio/engine/levels';

export interface SessionSnapshot extends AdaptationSnapshot {
  readonly tempoBpm: number | null;
}

/** Binds guidance to the existing audio engine; no musical timers or extra worker. */
export class AdaptationSession {
  #guidance = new AdaptationEngine();
  #audio: AudioEngine | null = null;
  #lastTiming: TransitionTiming | null = null;
  #snapshot: SessionSnapshot = { ...this.#guidance.snapshot, tempoBpm: null };
  readonly #listeners = new Set<() => void>();

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

  reset = (): void => {
    this.#guidance = new AdaptationEngine();
    this.#lastTiming = null;
    if (this.#audio !== null) {
      if (this.#audio.level !== CALIBRATION_LEVEL) this.#audio.applyLevel(CALIBRATION_LEVEL);
      this.#guidance.start(this.#audio.audioTime, CALIBRATION_LEVEL);
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
