import type { SourceKind } from '../acquisition/sourceCatalog';
import type { ActivationState } from '../adaptation/activationStates';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { COMPUTE_PERIOD_S } from '../signal/processing/thresholds';
import { MS_PER_SECOND } from '../../shared/time';
import type { SessionRecord, SessionSample } from './sessionRecord';
import { uuidv7 } from './uuidv7';

export interface SessionStart {
  readonly plannedMinutes: number;
  readonly sourceKind: SourceKind | null;
  readonly ratingBefore: number | null;
}

interface ActiveSession extends SessionStart {
  sourceKind: SourceKind | null;
  readonly id: string;
  readonly startedAtMs: number;
  readonly samples: SessionSample[];
  /** Signal second that maps to the session's second 0. */
  offsetS: number | null;
  lastSecond: number;
}

/**
 * Collects one sample per published index set while the music plays and
 * turns the session into a storable record when it ends.
 *
 * Samples use signal time, like the analysis windows, so a sped-up simulator
 * produces as many samples as a real strap would in the same signal time.
 * When the source restarts mid-session its clock goes back to zero; the
 * offset moves so the `second` column stays unique and increasing.
 */
export class SessionRecorder {
  readonly #nowMs: () => number;
  #session: ActiveSession | null = null;

  constructor(nowMs: () => number = Date.now) {
    this.#nowMs = nowMs;
  }

  get active(): boolean {
    return this.#session !== null;
  }

  start(start: SessionStart): void {
    const startedAtMs = this.#nowMs();
    this.#session = { ...start, id: uuidv7(startedAtMs), startedAtMs, samples: [], offsetS: null, lastSecond: 0 };
  }

  /** Records the source actually used; the last one connected wins. */
  setSource(kind: SourceKind): void {
    if (this.#session !== null) this.#session.sourceKind = kind;
  }

  add(result: IndicesResult, estimatedState: ActivationState | null): void {
    const session = this.#session;
    if (session === null) return;
    const signalS = Math.round(result.timeMs / MS_PER_SECOND);
    if (session.offsetS === null || signalS - session.offsetS <= session.lastSecond) {
      // First sample, or the source clock restarted: continue one period later.
      session.offsetS = signalS - (session.samples.length === 0 ? COMPUTE_PERIOD_S : session.lastSecond + COMPUTE_PERIOD_S);
    }
    const second = signalS - session.offsetS;
    session.lastSecond = second;
    session.samples.push({
      second,
      meanHr: result.meanHr,
      rmssd: result.rmssd,
      sdnn: result.sdnn,
      lfHfRatio: result.lfHfRatio,
      estimatedState,
      goodQuality: result.quality === 'good',
    });
  }

  /** Ends the session; returns `null` when none was running. */
  finish(listenedSeconds: number): SessionRecord | null {
    const session = this.#session;
    if (session === null) return null;
    this.#session = null;
    const endedAtMs = Math.max(this.#nowMs(), session.startedAtMs);
    return {
      id: session.id,
      startedAt: new Date(session.startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      plannedMinutes: session.plannedMinutes,
      listenedSeconds: Math.max(0, listenedSeconds),
      sourceKind: session.sourceKind,
      ratingBefore: session.ratingBefore,
      ratingAfter: null,
      samples: session.samples,
    };
  }
}
