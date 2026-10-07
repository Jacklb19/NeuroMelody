import { BEATS_FOR_HR } from './config';
import { MS_PER_MINUTE } from '../../shared/time';

/** Heart rate, in bpm, of a beat interval in ms. */
export function bpmFromRrMs(rrMs: number): number {
  return MS_PER_MINUTE / rrMs;
}

/** Beat interval, in ms, of a heart rate in bpm. */
export function rrMsFromBpm(bpm: number): number {
  return MS_PER_MINUTE / bpm;
}

/**
 * Heart rate a source reports: the mean of the given intervals, rounded to a
 * whole bpm like a BLE strap. Every source uses it so they cannot disagree.
 */
export function heartRateFromRr(intervalsMs: readonly number[]): number {
  const meanRr = intervalsMs.reduce((sum, rr) => sum + rr, 0) / intervalsMs.length;
  return Math.round(bpmFromRrMs(meanRr));
}

/** Appends new intervals and keeps only the ones the reported heart rate averages. */
export function keepRecentBeats(recent: readonly number[], added: readonly number[]): number[] {
  return [...recent, ...added].slice(-BEATS_FOR_HR);
}
