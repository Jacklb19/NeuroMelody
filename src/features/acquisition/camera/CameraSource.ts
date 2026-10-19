import type { ConnectionState, SignalSource, SourceObserver } from '../contract';
import { NOTIFICATION_PERIOD_MS } from '../config';
import { heartRateFromRr, keepRecentBeats } from '../heartRate';
import { SourceChannel } from '../sourceChannel';
import {
  CameraUnavailableError,
  startCameraCapture,
  type CameraCapture,
  type StartCameraCapture,
} from './cameraCapture';
import { PulseDetector, type FrameSample } from './pulseDetector';
import { MAX_RR_MS } from '../../signal/processing/thresholds';

export const CAMERA_GUIDANCE_IDS = ['inactive', 'cover', 'searching', 'receiving', 'lost'] as const;
export type CameraGuidanceState = (typeof CAMERA_GUIDANCE_IDS)[number];
/** Contact flicker must settle before a screen reader announces a new instruction. */
export const CAMERA_GUIDANCE_SETTLE_MS = 400;

export interface CameraSourceOptions {
  /** Opens the camera; tests inject a fake capture that emits synthetic frames. */
  readonly start?: StartCameraCapture;
}

/**
 * Fingertip pulse over the phone camera (proposal P-01, experimental),
 * behind the shared acquisition contract (ADR-03).
 *
 * Frames drive everything, so no timer is involved: signal time is the frame
 * timestamp minus the first frame's, and a notification falls due every
 * NOTIFICATION_PERIOD_MS of signal time, like a BLE strap. Each one carries
 * the RR intervals the detector completed since the previous notification
 * and a heart rate from the latest of them.
 *
 * Before the first beat of a finger contact there is no heart rate for it,
 * and the boundary only accepts one within MIN_HR–MAX_HR, so nothing is
 * notified: the source stays connected without a reading while the finger
 * settles over the lens. This holds for every new contact too, so an old
 * reading is never shown as current. When the finger leaves the lens the
 * notification carries `sensorContact: false` and the last heart rate, like
 * a strap that loses skin contact, so the signal thread marks the gap.
 *
 * Intervals completed in the period the finger leaves travel in that
 * contact-loss notification, so the signal thread discards them. That is
 * deliberate: the last beats before lifting the finger are distorted by the
 * change of pressure.
 *
 * If the system takes the camera away after it opened, the source moves to
 * `error` with the `unreadable` code instead of silently going quiet.
 */
export class CameraSource implements SignalSource {
  readonly kind = 'camera' as const;
  readonly #channel = new SourceChannel();
  readonly #start: StartCameraCapture;
  #capture: CameraCapture | null = null;
  #detector = new PulseDetector();
  /** Camera timestamp of the first frame: signal time 0. */
  #firstFrameMs: number | null = null;
  /** Signal time of the last frame used, to skip repeated or out-of-order frames. */
  #lastFrameMs: number | null = null;
  #nextNotificationMs = NOTIFICATION_PERIOD_MS;
  /** Intervals completed since the last notification. */
  #pendingRr: number[] = [];
  /** Latest intervals of the current finger contact, averaged into the heart rate. */
  #recentRr: number[] = [];
  /** Last heart rate; it survives a contact loss so the notification can still carry one. */
  #heartRate: number | null = null;
  /** Whether the current finger contact has produced an interval yet. */
  #contactHasBeat = false;
  /** Incremented on every connect/disconnect to drop frames and captures of an old connection. */
  #generation = 0;
  #guidance: CameraGuidanceState = 'inactive';
  readonly #guidanceListeners = new Set<() => void>();
  #candidate: CameraGuidanceState = 'inactive';
  #candidateSinceMs = 0;
  #hadContact = false;
  #lastBeatMs: number | null = null;

  constructor(options: CameraSourceOptions = {}) {
    this.#start = options.start ?? startCameraCapture;
  }

  get state(): ConnectionState {
    return this.#channel.state;
  }

  get guidance(): CameraGuidanceState { return this.#guidance; }

  /** Guidance is separate from physiological notifications, including before any heartbeat. */
  subscribeGuidance(listener: () => void): () => void {
    this.#guidanceListeners.add(listener);
    return () => { this.#guidanceListeners.delete(listener); };
  }

  #setGuidance(state: CameraGuidanceState): void {
    if (state === this.#guidance) return;
    this.#guidance = state;
    for (const listener of this.#guidanceListeners) listener();
  }

  subscribe(observer: SourceObserver): () => void {
    return this.#channel.subscribe(observer);
  }

  /**
   * Must be called from a user gesture, like the Bluetooth chooser: the
   * camera is requested before the first `await`. Failures leave the source
   * in `error` with a `CameraUnavailableError`.
   */
  async connect(): Promise<void> {
    if (this.#channel.state !== 'disconnected' && this.#channel.state !== 'error') {
      return;
    }
    const generation = ++this.#generation;
    this.#channel.changeState('connecting');
    this.#channel.resetTime();
    this.#resetSignal();
    try {
      const capture = await this.#start(
        (sample) => {
          // Frames count only once connected, and never those of an old connection.
          if (generation === this.#generation && this.#channel.state === 'connected') this.#onFrame(sample);
        },
        (error) => {
          if (generation !== this.#generation) return;
          // The capture already released the camera; nothing is left to stop.
          this.#capture = null;
          this.#setGuidance('inactive');
          this.#channel.changeState('error');
          this.#channel.emitError(error);
        },
      );
      if (generation !== this.#generation) {
        // Disconnected while the camera was opening.
        capture.stop();
        return;
      }
      this.#capture = capture;
      this.#channel.changeState('connected');
      if (generation === this.#generation) this.#setGuidance('cover');
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.#setGuidance('inactive');
      this.#channel.changeState('error');
      this.#channel.emitError(toCameraError(cause));
    }
  }

  disconnect(): Promise<void> {
    this.#generation++;
    const capture = this.#capture;
    this.#capture = null;
    capture?.stop();
    this.#setGuidance('inactive');
    this.#channel.changeState('disconnected');
    return Promise.resolve();
  }

  #resetSignal(): void {
    this.#detector = new PulseDetector();
    this.#firstFrameMs = null;
    this.#lastFrameMs = null;
    this.#nextNotificationMs = NOTIFICATION_PERIOD_MS;
    this.#pendingRr = [];
    this.#recentRr = [];
    this.#heartRate = null;
    this.#contactHasBeat = false;
    this.#hadContact = false;
    this.#lastBeatMs = null;
    this.#candidate = 'cover';
    this.#candidateSinceMs = 0;
  }

  #onFrame(sample: FrameSample): void {
    if (!Number.isFinite(sample.timeMs)) return;
    this.#firstFrameMs ??= sample.timeMs;
    const timeMs = sample.timeMs - this.#firstFrameMs;
    // Signal time never goes back (validateNotification), so neither do frames.
    if (this.#lastFrameMs !== null && timeMs <= this.#lastFrameMs) return;
    this.#lastFrameMs = timeMs;

    const intervals = this.#detector.push({ ...sample, timeMs });
    // A new contact starts a new average; the last heart rate is kept for the notifications.
    if (!this.#detector.fingerDetected) {
      this.#recentRr = [];
      this.#contactHasBeat = false;
      this.#lastBeatMs = null;
    }
    if (intervals.length > 0) {
      this.#lastBeatMs = timeMs;
      this.#contactHasBeat = true;
      this.#pendingRr.push(...intervals);
      this.#recentRr = keepRecentBeats(this.#recentRr, intervals);
      this.#heartRate = heartRateFromRr(this.#recentRr);
    }
    this.#updateGuidance(timeMs);
    this.#notifyDue(timeMs);
  }

  #updateGuidance(timeMs: number): void {
    const contact = this.#detector.fingerDetected;
    if (contact) this.#hadContact = true;
    const desired: CameraGuidanceState = !contact ? (this.#hadContact ? 'lost' : 'cover')
      : this.#lastBeatMs !== null && timeMs - this.#lastBeatMs <= MAX_RR_MS ? 'receiving' : 'searching';
    if (desired !== this.#candidate) {
      this.#candidate = desired;
      this.#candidateSinceMs = timeMs;
    }
    if (timeMs - this.#candidateSinceMs >= CAMERA_GUIDANCE_SETTLE_MS) this.#setGuidance(desired);
  }

  /** Emits every notification due up to `timeMs`; a late frame catches up period by period. */
  #notifyDue(timeMs: number): void {
    const generation = this.#generation;
    // Checked on every pass: an observer may disconnect the source while it receives a notification.
    while (generation === this.#generation && this.#channel.state === 'connected' && this.#nextNotificationMs <= timeMs) {
      const notificationMs = this.#nextNotificationMs;
      this.#nextNotificationMs += NOTIFICATION_PERIOD_MS;
      const heartRate = this.#heartRate;
      // No beat in this contact yet, hence no intervals either: nothing to report.
      if (heartRate === null || (this.#detector.fingerDetected && !this.#contactHasBeat)) continue;
      const rrIntervalsMs = this.#pendingRr;
      this.#pendingRr = [];
      this.#channel.notify({
        timeMs: notificationMs,
        heartRate,
        rrIntervalsMs,
        sensorContact: this.#detector.fingerDetected,
      });
    }
  }
}

/** Failures that are not already classified are reported as a camera that could not open. */
function toCameraError(cause: unknown): CameraUnavailableError {
  return cause instanceof CameraUnavailableError ? cause : new CameraUnavailableError('open_failed', { cause });
}
