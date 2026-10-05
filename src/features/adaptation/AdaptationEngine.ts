import type { LevelId } from '../audio/engine/levels';
import type { IndicesResult } from '../signal/processing/SignalProcessor';

export type ActivationState = 'high' | 'low' | 'uncertain';
export const CALIBRATION_MS = 180_000;
export const MIN_BASELINE_READINGS = 12;
export const MIN_LEVEL_DURATION_S = 180;

export interface AdaptationSnapshot {
  readonly state: ActivationState | null;
  readonly calibrated: boolean;
  readonly baselineReadings: number;
  readonly qualityGood: boolean;
  readonly level: LevelId;
}

/** Provisional, uncalibrated rules approved for S4; not physiological thresholds. */
export function estimateState(hr: number, rmssd: number, baseHr: number, baseRmssd: number): ActivationState {
  if (hr / baseHr >= 1.1 && rmssd / baseRmssd <= 0.8) return 'high';
  if (hr / baseHr <= 0.9 && rmssd / baseRmssd >= 1.2) return 'low';
  return 'uncertain';
}

/** Pure guidance: signal time calibrates; the audio clock governs dwell time. */
export class AdaptationEngine {
  #lastTimeMs = -1;
  #sumHr = 0;
  #sumRmssd = 0;
  #count = 0;
  #calibrated = false;
  #qualityGood = false;
  #candidate: ActivationState | null = null;
  #consecutive = 0;
  #accepted: ActivationState | null = null;
  #recent: ActivationState[] = [];
  #level: LevelId = 'intermediate';
  #levelStartS = 0;

  get snapshot(): AdaptationSnapshot {
    return { state: this.#accepted, calibrated: this.#calibrated,
      baselineReadings: this.#count, qualityGood: this.#qualityGood, level: this.#level };
  }

  /** Restarts dwell and nominations when playback starts or resumes. */
  start(audioTime: number, level: LevelId): void {
    this.#level = level;
    this.#levelStartS = audioTime;
    this.invalidate();
  }

  /** Missing signal or a worker error blocks guidance without changing the sound. */
  invalidate(): void {
    this.#qualityGood = false;
    this.#candidate = null;
    this.#consecutive = 0;
    this.#recent = [];
  }

  /** Returns at most one adjacent musical step, never a queue of stale decisions. */
  process(result: IndicesResult, audioTime: number, playing: boolean): LevelId | null {
    if (!Number.isFinite(result.timeMs) || result.timeMs <= this.#lastTimeMs) return null;
    this.#lastTimeMs = result.timeMs;
    const { meanHr, rmssd } = result;
    this.#qualityGood = result.quality === 'good' && meanHr !== null && rmssd !== null &&
      Number.isFinite(meanHr) && Number.isFinite(rmssd) && meanHr > 0 && rmssd > 0;
    if (!this.#calibrated) {
      if (this.#qualityGood && meanHr !== null && rmssd !== null) {
        this.#sumHr += meanHr;
        this.#sumRmssd += rmssd;
        this.#count++;
      }
      this.#calibrated = result.timeMs >= CALIBRATION_MS && this.#count >= MIN_BASELINE_READINGS;
      if (!this.#calibrated) return null;
    }
    const state = this.#qualityGood && meanHr !== null && rmssd !== null
      ? estimateState(meanHr, rmssd, this.#sumHr / this.#count, this.#sumRmssd / this.#count)
      : 'uncertain';
    if (!this.#qualityGood) {
      // Bad quality breaks the previous nomination, but can establish Uncertain.
      if (this.#candidate !== 'uncertain') this.#consecutive = 0;
      this.#recent = [];
    }
    this.#recent.push(state);
    if (this.#recent.length > 3) this.#recent.shift();
    this.#consecutive = state === this.#candidate ? this.#consecutive + 1 : 1;
    this.#candidate = state;
    const changed = this.#consecutive >= 3 && state !== this.#accepted;
    if (changed) this.#accepted = state;
    if (!playing || !this.#qualityGood) return null;
    let next: LevelId | null = null;
    if (changed && state === 'high') {
      next = this.#level === 'target' ? 'intermediate' : this.#level === 'intermediate' ? 'high' : null;
    } else if (this.#accepted !== null && audioTime - this.#levelStartS >= MIN_LEVEL_DURATION_S &&
      this.#recent.length === 3 && !this.#recent.includes('high')) {
      next = this.#level === 'high' ? 'intermediate' : this.#level === 'intermediate' ? 'target' : null;
    }
    if (next !== null) {
      this.#level = next;
      this.#levelStartS = audioTime;
    }
    return next;
  }
}
