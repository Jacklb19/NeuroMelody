import type { BeatNotification } from '../acquisition/contract';
import type { AdaptationSnapshot } from '../adaptation/AdaptationEngine';
import { CALIBRATION_MS, MIN_BASELINE_READINGS } from '../adaptation/rules';
import { MS_PER_MINUTE, MS_PER_SECOND } from '../../shared/time';

/**
 * The live pulse of the session (P-17): the pulse beat by beat over the last
 * minute and how far the baseline has come. It is a light view for the
 * person; the analysis and its chart in the technical details do not change.
 */

/** Span of signal the line shows, in ms. */
export const PULSE_TRACE_WINDOW_MS = 60_000;
/**
 * Intervals outside this range are left out of the line only: they are
 * missed or doubled beats a person would read as a jump of the heart. The
 * analysis keeps its own filtering (ADR-15).
 */
export const PULSE_TRACE_MIN_RR_MS = 300;
export const PULSE_TRACE_MAX_RR_MS = 2000;
/** The line never spreads less than this over its height, so a steady pulse looks steady instead of jagged. */
export const PULSE_TRACE_MIN_SPAN_BPM = 12;

export interface PulsePoint {
  /** Signal time of the beat, in ms. */
  readonly timeMs: number;
  readonly bpm: number;
}

/**
 * The beats of the last minute, fed with every notification of the source.
 * With beat-to-beat intervals each beat is a point; a watch that sends only
 * the pulse (ADR-51) gives one point per notification. Once a connection has
 * sent intervals, notifications without them add nothing, so the two kinds
 * of point never mix in one line.
 */
export class PulseTraceBuffer {
  #points: PulsePoint[] = [];
  #beatToBeat = false;

  get points(): readonly PulsePoint[] {
    return this.#points;
  }

  /** Forgets every point, for a source that connects again: its signal time starts again at 0. */
  clear(): void {
    this.#points = [];
    this.#beatToBeat = false;
  }

  /** Adds what one notification brings; returns whether the line changed. */
  push(notification: BeatNotification): boolean {
    if (notification.sensorContact === false) return false;
    const added = notification.rrIntervalsMs.length > 0 ? this.#addBeats(notification) : this.#addPulse(notification);
    if (!added) return false;
    const oldest = notification.timeMs - PULSE_TRACE_WINDOW_MS;
    const firstKept = this.#points.findIndex((point) => point.timeMs >= oldest);
    if (firstKept > 0) this.#points = this.#points.slice(firstKept);
    return true;
  }

  #addBeats({ timeMs, rrIntervalsMs }: BeatNotification): boolean {
    this.#beatToBeat = true;
    // The last interval ends at the notification; each earlier one ends where the next began.
    const beats: PulsePoint[] = [];
    let end = timeMs;
    for (let i = rrIntervalsMs.length - 1; i >= 0; i--) {
      const rr = rrIntervalsMs[i] ?? 0;
      if (rr >= PULSE_TRACE_MIN_RR_MS && rr <= PULSE_TRACE_MAX_RR_MS) beats.unshift({ timeMs: end, bpm: MS_PER_MINUTE / rr });
      end -= rr;
    }
    const last = this.#points.at(-1)?.timeMs ?? -Infinity;
    const fresh = beats.filter((beat) => beat.timeMs > last);
    this.#points.push(...fresh);
    return fresh.length > 0;
  }

  #addPulse({ timeMs, heartRate }: BeatNotification): boolean {
    if (this.#beatToBeat || !Number.isFinite(heartRate) || heartRate <= 0) return false;
    const last = this.#points.at(-1)?.timeMs ?? -Infinity;
    if (timeMs <= last) return false;
    this.#points.push({ timeMs, bpm: heartRate });
    return true;
  }
}

/**
 * SVG path of the line in a box of `width` × `height`: the newest beat at
 * the right edge, the pulse spread over the height. Until a whole window has
 * arrived the line spans the box from its first beat, so it grows across it
 * instead of sitting in a corner; then it moves along. Empty with fewer than
 * two points.
 */
export function pulseTracePath(points: readonly PulsePoint[], width: number, height: number): string {
  const first = points[0];
  const newest = points.at(-1);
  if (points.length < 2 || first === undefined || newest === undefined) return '';
  const spanMs = Math.min(newest.timeMs - first.timeMs, PULSE_TRACE_WINDOW_MS);
  const values = points.map((point) => point.bpm);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const middle = (low + high) / 2;
  const span = Math.max(high - low, PULSE_TRACE_MIN_SPAN_BPM);
  const x = (timeMs: number): number => spanMs <= 0 ? width : width * (1 - (newest.timeMs - timeMs) / spanMs);
  // Higher pulse sits higher: SVG grows downwards.
  const y = (bpm: number): number => height * (0.5 - (bpm - middle) / span);
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.timeMs).toFixed(1)} ${y(point.bpm).toFixed(1)}`)
    .join(' ');
}

export interface ReferenceProgress {
  /** Seconds of signal counted towards the baseline, up to the whole span. */
  readonly elapsedS: number;
  readonly totalS: number;
  readonly readings: number;
  readonly minReadings: number;
  readonly done: boolean;
  /** From 0 to 1: the slower of time and readings, since the baseline needs both. */
  readonly share: number;
}

/** How far the baseline has come, from the adaptation snapshot (ADR-12: 3 minutes and 12 good readings). */
export function referenceProgress(snapshot: Pick<AdaptationSnapshot, 'calibrated' | 'baselineReadings' | 'signalTimeMs'>): ReferenceProgress {
  const totalS = CALIBRATION_MS / MS_PER_SECOND;
  const elapsedS = Math.min(snapshot.signalTimeMs, CALIBRATION_MS) / MS_PER_SECOND;
  const readings = Math.min(snapshot.baselineReadings, MIN_BASELINE_READINGS);
  const share = snapshot.calibrated ? 1 : Math.min(elapsedS / totalS, readings / MIN_BASELINE_READINGS);
  return { elapsedS, totalS, readings, minReadings: MIN_BASELINE_READINGS, done: snapshot.calibrated, share };
}
