import { CALIBRATION_LEVEL, nextLevel, previousLevel, type LevelId } from '../audio/engine/levels';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import type { ActivationState } from './activationStates';
import {
  CALIBRATION_MS,
  HEART_RATE_CHANGE,
  HYSTERESIS_ESTIMATES,
  MIN_BASELINE_READINGS,
  MIN_LEVEL_DURATION_S,
  NO_HIGH_WINDOW_ESTIMATES,
  RMSSD_CHANGE,
} from './rules';

export type { ActivationState } from './activationStates';

export interface TransitionTiming {
  readonly direction: 'advance' | 'retreat';
  readonly acceptedAtS: number;
  readonly eligibleAtS: number;
  readonly scheduledAtS: number;
}

export interface AdaptationSnapshot {
  readonly state: ActivationState | null;
  readonly calibrated: boolean;
  readonly baselineReadings: number;
  readonly qualityGood: boolean;
  readonly level: LevelId;
  readonly waitingForDwell: boolean;
  readonly lastTransition: TransitionTiming | null;
}

/** Provisional, uncalibrated rules approved for S4; not physiological thresholds. */
export function estimateState(hr: number, rmssd: number, baseHr: number, baseRmssd: number): ActivationState {
  const hrRatio = hr / baseHr;
  const rmssdRatio = rmssd / baseRmssd;
  if (hrRatio >= 1 + HEART_RATE_CHANGE && rmssdRatio <= 1 - RMSSD_CHANGE) return 'high';
  if (hrRatio <= 1 - HEART_RATE_CHANGE && rmssdRatio >= 1 + RMSSD_CHANGE) return 'low';
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
  #level: LevelId = CALIBRATION_LEVEL;
  #levelStartS = 0;
  #audioTimeS = 0;
  #acceptedAtS = 0;
  #criteriaReadyS: number | null = null;
  #lastTransition: TransitionTiming | null = null;

  get snapshot(): AdaptationSnapshot {
    return { state: this.#accepted, calibrated: this.#calibrated,
      baselineReadings: this.#count, qualityGood: this.#qualityGood, level: this.#level,
      waitingForDwell: this.#calibrated && this.#qualityGood && this.#accepted !== null &&
        this.#accepted !== 'high' && nextLevel(this.#level) !== null &&
        this.#audioTimeS < this.#levelStartS + MIN_LEVEL_DURATION_S,
      lastTransition: this.#lastTransition };
  }

  /** Restarts dwell and nominations when playback starts or resumes. */
  start(audioTime: number, level: LevelId): void {
    this.#level = level;
    this.#levelStartS = audioTime;
    this.#audioTimeS = audioTime;
    this.#accepted = null;
    this.invalidate();
  }

  /** Missing signal or a worker error blocks guidance without changing the sound. */
  invalidate(): void {
    this.#qualityGood = false;
    this.#candidate = null;
    this.#consecutive = 0;
    this.#recent = [];
    this.#criteriaReadyS = null;
  }

  /** Returns at most one adjacent musical step, never a queue of stale decisions. */
  process(result: IndicesResult, audioTime: number, playing: boolean): LevelId | null {
    if (!Number.isFinite(result.timeMs) || result.timeMs <= this.#lastTimeMs) return null;
    this.#lastTimeMs = result.timeMs;
    this.#audioTimeS = audioTime;
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
    if (this.#recent.length > NO_HIGH_WINDOW_ESTIMATES) this.#recent.shift();
    this.#consecutive = state === this.#candidate ? this.#consecutive + 1 : 1;
    this.#candidate = state;
    const changed = this.#consecutive >= HYSTERESIS_ESTIMATES && state !== this.#accepted;
    if (changed) {
      this.#accepted = state;
      this.#acceptedAtS = audioTime;
    }
    const ready = this.#qualityGood && this.#accepted !== null &&
      this.#recent.length === NO_HIGH_WINDOW_ESTIMATES && !this.#recent.includes('high');
    this.#criteriaReadyS = ready ? this.#criteriaReadyS ?? audioTime : null;
    if (!playing || !this.#qualityGood) return null;
    if (changed && state === 'high') {
      const next = previousLevel(this.#level);
      return next === null ? null : this.#transition(next, 'retreat', audioTime, audioTime);
    }
    return this.advance(audioTime, playing);
  }

  /** Checks dwell on fresh source notifications without counting them as estimates. */
  advance(audioTime: number, playing: boolean): LevelId | null {
    this.#audioTimeS = audioTime;
    if (!playing || this.#criteriaReadyS === null || !this.#qualityGood) return null;
    const eligibleAtS = Math.max(this.#levelStartS + MIN_LEVEL_DURATION_S, this.#criteriaReadyS);
    if (audioTime < eligibleAtS) return null;
    const next = nextLevel(this.#level);
    return next === null ? null : this.#transition(next, 'advance', eligibleAtS, audioTime);
  }

  #transition(next: LevelId, direction: TransitionTiming['direction'], eligibleAtS: number, scheduledAtS: number): LevelId {
    this.#lastTransition = { direction, acceptedAtS: this.#acceptedAtS, eligibleAtS, scheduledAtS };
    this.#level = next;
    this.#levelStartS = scheduledAtS;
    return next;
  }
}
