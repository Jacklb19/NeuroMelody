import { CALIBRATION_LEVEL, TARGET_LEVEL, nextLevel, previousLevel, type LevelId } from '../audio/engine/levels';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import type { ActivationState } from './activationStates';
import { predictActivation, type ActivationModel } from './classifier/activationModel';
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
  /** Who estimated the accepted state: the trained model, or the rules when no model is loaded. */
  readonly estimator: EstimatorKind;
  /** Calibrated probability the model gives the accepted state; `null` with the rules, which have none. */
  readonly confidence: number | null;
  readonly level: LevelId;
  readonly waitingForDwell: boolean;
  readonly lastTransition: TransitionTiming | null;
}

export type EstimatorKind = 'model' | 'rules';

/** The stretch of the ladder a session moves in (ADR-38). */
export interface GuidanceRange {
  /** Level the music starts at and holds while the baseline is taken. */
  readonly startLevel: LevelId;
  /** Calmest level the guidance advances to; it never goes past it. */
  readonly calmestLevel: LevelId;
}

/** The whole ladder from the calibration level: the range of a session without a program. */
export const DEFAULT_GUIDANCE_RANGE: GuidanceRange = { startLevel: CALIBRATION_LEVEL, calmestLevel: TARGET_LEVEL };

/** Provisional, uncalibrated rules (ADR-12); the fallback when the trained model is unavailable. */
export function estimateState(hr: number, rmssd: number, baseHr: number, baseRmssd: number): ActivationState {
  const hrRatio = hr / baseHr;
  const rmssdRatio = rmssd / baseRmssd;
  if (hrRatio >= 1 + HEART_RATE_CHANGE && rmssdRatio <= 1 - RMSSD_CHANGE) return 'high';
  if (hrRatio <= 1 - HEART_RATE_CHANGE && rmssdRatio >= 1 + RMSSD_CHANGE) return 'low';
  return 'uncertain';
}

/**
 * Pure guidance: signal time calibrates; the audio clock governs dwell time.
 * The state of each reading comes from the trained classifier (ADR-32) when
 * one is given, and from the rules otherwise; hysteresis, dwell and the
 * musical steps are the same for both.
 */
export class AdaptationEngine {
  #model: ActivationModel | null;
  #lastTimeMs = -1;
  #sumHr = 0;
  #sumRmssd = 0;
  #sumSdnn = 0;
  #sdnnCount = 0;
  #count = 0;
  #confidence: number | null = null;
  #acceptedConfidence: number | null = null;
  #calibrated = false;
  #qualityGood = false;
  #candidate: ActivationState | null = null;
  #consecutive = 0;
  #accepted: ActivationState | null = null;
  #recent: ActivationState[] = [];
  readonly #calmestLevel: LevelId;
  #level: LevelId;
  #levelStartS = 0;
  #audioTimeS = 0;
  #acceptedAtS = 0;
  #criteriaReadyS: number | null = null;
  #lastTransition: TransitionTiming | null = null;

  constructor(model: ActivationModel | null = null, range: GuidanceRange = DEFAULT_GUIDANCE_RANGE) {
    this.#model = model;
    this.#level = range.startLevel;
    this.#calmestLevel = range.calmestLevel;
  }

  /** Swaps the estimator, for example when the model finishes loading mid-session. */
  setModel(model: ActivationModel | null): void {
    this.#model = model;
  }

  get snapshot(): AdaptationSnapshot {
    return { state: this.#accepted, calibrated: this.#calibrated,
      baselineReadings: this.#count, qualityGood: this.#qualityGood, level: this.#level,
      estimator: this.#model === null ? 'rules' : 'model', confidence: this.#acceptedConfidence,
      waitingForDwell: this.#calibrated && this.#qualityGood && this.#accepted !== null &&
        this.#accepted !== 'high' && this.#calmerLevel() !== null &&
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
    const { meanHr, rmssd, sdnn } = result;
    this.#qualityGood = result.quality === 'good' && meanHr !== null && rmssd !== null &&
      Number.isFinite(meanHr) && Number.isFinite(rmssd) && meanHr > 0 && rmssd > 0;
    if (!this.#calibrated) {
      if (this.#qualityGood && meanHr !== null && rmssd !== null) {
        this.#sumHr += meanHr;
        this.#sumRmssd += rmssd;
        this.#count++;
        if (sdnn !== null && Number.isFinite(sdnn) && sdnn > 0) {
          this.#sumSdnn += sdnn;
          this.#sdnnCount++;
        }
      }
      this.#calibrated = result.timeMs >= CALIBRATION_MS && this.#count >= MIN_BASELINE_READINGS;
      if (!this.#calibrated) return null;
    }
    const state = this.#qualityGood && meanHr !== null && rmssd !== null
      ? this.#estimate(meanHr, rmssd, sdnn)
      : 'uncertain';
    if (!this.#qualityGood) this.#confidence = null;
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
    // The confidence shown follows the latest reading that agrees with the accepted state.
    if (state === this.#accepted) this.#acceptedConfidence = this.#confidence;
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
    const next = this.#calmerLevel();
    return next === null ? null : this.#transition(next, 'advance', eligibleAtS, audioTime);
  }

  /** The next step towards calm, or `null` once the calmest level of the session is reached. */
  #calmerLevel(): LevelId | null {
    return this.#level === this.#calmestLevel ? null : nextLevel(this.#level);
  }

  /** The model's estimate when it can give one; the rules otherwise. */
  #estimate(meanHr: number, rmssd: number, sdnn: number | null): ActivationState {
    const baseHr = this.#sumHr / this.#count;
    const baseRmssd = this.#sumRmssd / this.#count;
    if (this.#model !== null && sdnn !== null && this.#sdnnCount > 0) {
      const prediction = predictActivation(
        this.#model,
        { meanHr, rmssd, sdnn },
        { meanHr: baseHr, rmssd: baseRmssd, sdnn: this.#sumSdnn / this.#sdnnCount },
      );
      if (prediction !== null) {
        this.#confidence = prediction.confidence;
        return prediction.state;
      }
    }
    this.#confidence = null;
    return estimateState(meanHr, rmssd, baseHr, baseRmssd);
  }

  #transition(next: LevelId, direction: TransitionTiming['direction'], eligibleAtS: number, scheduledAtS: number): LevelId {
    this.#lastTransition = { direction, acceptedAtS: this.#acceptedAtS, eligibleAtS, scheduledAtS };
    this.#level = next;
    this.#levelStartS = scheduledAtS;
    return next;
  }
}
