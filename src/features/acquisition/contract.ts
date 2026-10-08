/**
 * Shared contract of the acquisition layer (ADR-03).
 *
 * The BLE strap, the simulator and recording playback implement
 * `SignalSource`; the rest of the system depends only on this contract, so
 * it cannot tell one source from another (HU-02).
 */

import type { SourceKind } from './sourceCatalog';

export type { SourceKind } from './sourceCatalog';

/** Connection state of the source; the interface always shows it (HU-01). */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * A source notification, shaped like the standard BLE heart rate
 * characteristic (≈ 1 per second).
 */
export interface BeatNotification {
  /**
   * Signal time in milliseconds since connection, monotonically
   * non-decreasing. It is not wall-clock time: with a sped-up simulator it
   * advances faster, and analysis windows must use this time.
   */
  readonly timeMs: number;
  /** Heart rate in beats per minute, as reported by the source. */
  readonly heartRate: number;
  /** Beat-to-beat intervals completed since the previous notification, in ms. */
  readonly rrIntervalsMs: readonly number[];
  /** Sensor contact with the skin; `null` when the source does not report it. */
  readonly sensorContact: boolean | null;
}

/** Callbacks of a source consumer; all are optional. */
export interface SourceObserver {
  readonly onNotification?: (notification: BeatNotification) => void;
  readonly onStateChange?: (state: ConnectionState) => void;
  readonly onError?: (error: Error) => void;
}

/** Contract every signal source fulfils. */
export interface SignalSource {
  readonly kind: SourceKind;
  readonly state: ConnectionState;
  /** Starts acquisition; signal time starts again at 0. */
  connect(): Promise<void>;
  /** Stops acquisition; once it resolves no more notifications arrive. */
  disconnect(): Promise<void>;
  /** Registers an observer and returns the function that unsubscribes it. */
  subscribe(observer: SourceObserver): () => void;
}
