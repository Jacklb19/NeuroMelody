import type { BeatNotification } from '../../acquisition/contract';
import { MAX_GAP_MS } from './thresholds';

/**
 * Decides, notification by notification, whether beats are still arriving:
 * the sensor reports contact and the last RR interval is no older than
 * {@link MAX_GAP_MS} of signal time. Until a connection has sent any interval,
 * a notification with contact counts instead, so a watch that sends only the
 * pulse (ADR-51) is not taken for a lost sensor. Lives in the signal thread so the main
 * thread only hears the verdict (RNF-04).
 */
export class ContactMonitor {
  #lastRrTimeMs = 0;
  #sawIntervals = false;

  /** True while beats keep flowing; false on lost contact or a gap. */
  observe(notification: BeatNotification): boolean {
    if (notification.rrIntervalsMs.length > 0) this.#sawIntervals = true;
    if (notification.rrIntervalsMs.length > 0 || (!this.#sawIntervals && notification.sensorContact !== false)) {
      this.#lastRrTimeMs = notification.timeMs;
    }
    return notification.sensorContact !== false && notification.timeMs - this.#lastRrTimeMs <= MAX_GAP_MS;
  }

  /** A new connection restarts signal time at 0. */
  reset(): void {
    this.#lastRrTimeMs = 0;
    this.#sawIntervals = false;
  }
}
