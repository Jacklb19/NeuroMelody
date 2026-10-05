import type { AudioEngine } from '../audio/engine/AudioEngine';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { AdaptationEngine, type AdaptationSnapshot } from './AdaptationEngine';

export interface SessionSnapshot extends AdaptationSnapshot {
  readonly tempoBpm: number | null;
}

/** Binds guidance to the existing audio engine; no musical timers or extra worker. */
export class AdaptationSession {
  #guidance = new AdaptationEngine();
  #audio: AudioEngine | null = null;
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
    if (this.#audio !== null) {
      if (this.#audio.level !== 'intermediate') this.#audio.applyLevel('intermediate');
      this.#guidance.start(this.#audio.audioTime, 'intermediate');
    }
    this.#publish();
  };

  invalidate = (): void => {
    this.#guidance.invalidate();
    this.#publish();
  };

  receive = (result: IndicesResult): void => {
    const audio = this.#audio;
    const level = this.#guidance.process(result, audio?.audioTime ?? 0, audio?.state === 'playing');
    if (level !== null && audio !== null) audio.applyLevel(level);
    this.#publish();
  };

  #publish(): void {
    this.#snapshot = { ...this.#guidance.snapshot, tempoBpm: this.#audio?.tempoBpm ?? null };
    for (const listener of this.#listeners) listener();
  }
}
