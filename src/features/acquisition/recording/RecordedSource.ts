import type { ConnectionState, SignalSource, SourceObserver } from '../contract';
import { CHECK_PERIOD_MS, NOTIFICATION_PERIOD_MS } from '../config';
import { heartRateFromRr, keepRecentBeats } from '../heartRate';
import { SourceChannel } from '../sourceChannel';
import type { Speed } from '../speedCatalog';
import { browserClock, browserScheduler, type Clock, type Scheduler } from '../timing';
import { loadRecording, parseRecording, type Recording } from './recording';
import type { RecordingId } from './recordingCatalog';

export interface RecordedSourceOptions {
  readonly recordId: RecordingId;
  readonly speed: Speed;
  readonly clock?: Clock;
  readonly scheduler?: Scheduler;
  readonly load?: typeof loadRecording;
}

/** Plays an example through the shared acquisition contract (ADR-03), without losing delayed beats. */
export class RecordedSource implements SignalSource {
  readonly kind = 'recording' as const;
  readonly #channel = new SourceChannel();
  readonly #options: RecordedSourceOptions;
  readonly #clock: Clock;
  readonly #scheduler: Scheduler;
  #request: AbortController | null = null;
  #cancel: (() => void) | null = null;
  #recording: Recording | null = null;
  #startMs = 0;
  #nextNotificationMs = NOTIFICATION_PERIOD_MS;
  #index = 0;
  #beatEndMs = 0;
  #recent: number[] = [];

  constructor(options: RecordedSourceOptions) {
    this.#options = options;
    this.#clock = options.clock ?? browserClock;
    this.#scheduler = options.scheduler ?? browserScheduler;
  }

  get state(): ConnectionState { return this.#channel.state; }

  subscribe(observer: SourceObserver): () => void { return this.#channel.subscribe(observer); }

  async connect(): Promise<void> {
    if (this.#request !== null || this.#cancel !== null) return;
    const request = new AbortController();
    this.#request = request;
    this.#channel.changeState('connecting');
    this.#channel.resetTime();
    try {
      const value = await (this.#options.load ?? loadRecording)(this.#options.recordId, request.signal);
      if (request.signal.aborted) return;
      this.#recording = parseRecording(value, this.#options.recordId);
      this.#index = 0;
      this.#beatEndMs = 0;
      this.#recent = [];
      this.#nextNotificationMs = NOTIFICATION_PERIOD_MS;
      this.#startMs = this.#clock.nowMs();
      this.#cancel = this.#scheduler.repeat(() => { this.#emitPending(); }, CHECK_PERIOD_MS);
      this.#channel.changeState('connected');
    } catch (cause) {
      if (!request.signal.aborted) {
        this.#channel.changeState('error');
        this.#channel.emitError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    } finally {
      if (this.#request === request) this.#request = null;
    }
  }

  disconnect(): Promise<void> {
    this.#request?.abort();
    this.#request = null;
    this.#cancel?.();
    this.#cancel = null;
    this.#channel.changeState('disconnected');
    return Promise.resolve();
  }

  #emitPending(): void {
    const recording = this.#recording;
    if (recording === null) return;
    const timeMs = Math.min(recording.durationMs, (this.#clock.nowMs() - this.#startMs) * this.#options.speed);
    while (this.#cancel !== null && this.#nextNotificationMs <= timeMs) {
      const rrIntervalsMs: number[] = [];
      let rr = recording.rrIntervalsMs[this.#index];
      while (rr !== undefined && this.#beatEndMs + rr <= this.#nextNotificationMs) {
        rrIntervalsMs.push(rr);
        this.#beatEndMs += rr;
        this.#index++;
        rr = recording.rrIntervalsMs[this.#index];
      }
      this.#recent = keepRecentBeats(this.#recent, rrIntervalsMs);
      // Before the first complete beat, the first interval of the recording is used
      // (parseRecording guarantees there is one).
      const reference = this.#recent.length > 0 ? this.#recent : recording.rrIntervalsMs.slice(0, 1);
      this.#channel.notify({ timeMs: this.#nextNotificationMs,
        heartRate: heartRateFromRr(reference),
        rrIntervalsMs, sensorContact: null });
      this.#nextNotificationMs += NOTIFICATION_PERIOD_MS;
    }
    if (this.#cancel !== null && timeMs >= recording.durationMs) void this.disconnect();
  }
}
