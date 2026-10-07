import { MS_PER_SECOND } from '../../shared/time';

/**
 * The standard BLE heart rate profile expresses RR intervals in units of
 * 1/1024 s. The simulator quantizes at the same resolution so its output
 * cannot be told apart from a real strap (HU-02).
 */
export const RR_UNITS_PER_SECOND = 1024;

/** Converts BLE units of 1/1024 s to milliseconds. */
export function msFromRrUnits(units: number): number {
  return (units * MS_PER_SECOND) / RR_UNITS_PER_SECOND;
}

/** Rounds an interval in ms to the 1/1024 s resolution. */
export function quantizeRrMs(ms: number): number {
  return msFromRrUnits(Math.round((ms * RR_UNITS_PER_SECOND) / MS_PER_SECOND));
}
