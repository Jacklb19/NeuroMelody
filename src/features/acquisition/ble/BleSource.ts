import type { ConnectionState, SignalSource, SourceObserver } from '../contract';
import { ATTEMPT_TIMEOUT_MS, RECONNECT_DELAYS_MS } from '../config';
import { SourceChannel } from '../sourceChannel';
import { browserClock, type Clock } from '../timing';
import { HeartRateMeasurementError, parseHeartRateMeasurement } from './parseHeartRateMeasurement';
import {
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  type BleDevice,
  type BluetoothAdapter,
  type HeartRateCharacteristic,
} from './webBluetooth';

/** Why the strap could not be used; the interface turns each code into text. */
export const BLE_FAILURES = [
  'no_remembered_device',
  'no_gatt',
  'link_lost',
  'permission_denied',
  'device_unavailable',
  'connect_failed',
  'attempt_timed_out',
] as const;

export type BleFailure = (typeof BLE_FAILURES)[number];

/** The strap could not be connected or the link was lost for good. */
export class BleConnectionError extends Error {
  readonly code: BleFailure;

  constructor(code: BleFailure, options?: ErrorOptions) {
    super(`Bluetooth strap unavailable: ${code}`, options);
    this.name = 'BleConnectionError';
    this.code = code;
  }
}

/** Runs a task once after a delay and returns the function that cancels it. */
export interface Delay {
  after(task: () => void, delayMs: number): () => void;
}

const browserDelay: Delay = {
  after: (task, delayMs) => {
    const id = setTimeout(task, delayMs);
    return () => {
      clearTimeout(id);
    };
  },
};

export interface BleSourceOptions {
  readonly bluetooth: BluetoothAdapter;
  /**
   * `choose` opens the browser's device chooser; `remembered` reuses a strap
   * the user already authorised, so a reload does not ask again.
   */
  readonly mode: 'choose' | 'remembered';
  readonly clock?: Clock;
  readonly delay?: Delay;
}

/**
 * Heart rate strap over Web Bluetooth (RF-01, RF-03), behind the shared
 * acquisition contract (ADR-03).
 *
 * Signal time counts from the user's connection and keeps running across
 * automatic reconnections, so the signal thread sees the outage as a gap
 * instead of a new session. Reconnection timers are not musical timing: the
 * audio thread never depends on them.
 */
export class BleSource implements SignalSource {
  readonly kind = 'ble' as const;
  readonly #channel = new SourceChannel();
  readonly #options: BleSourceOptions;
  readonly #clock: Clock;
  readonly #delay: Delay;
  #device: BleDevice | null = null;
  #characteristic: HeartRateCharacteristic | null = null;
  #startMs = 0;
  #attempt = 0;
  #cancelRetry: (() => void) | null = null;
  /** Incremented on every user connect/disconnect to drop stale async work. */
  #generation = 0;
  /** Incremented on every reconnection attempt, so a timed-out one is ignored if it resolves late. */
  #attemptId = 0;

  constructor(options: BleSourceOptions) {
    this.#options = options;
    this.#clock = options.clock ?? browserClock;
    this.#delay = options.delay ?? browserDelay;
  }

  get state(): ConnectionState {
    return this.#channel.state;
  }

  subscribe(observer: SourceObserver): () => void {
    return this.#channel.subscribe(observer);
  }

  /** Must be called from a user gesture: the chooser is requested synchronously. */
  async connect(): Promise<void> {
    if (this.#channel.state !== 'disconnected' && this.#channel.state !== 'error') {
      return;
    }
    const generation = ++this.#generation;
    this.#channel.changeState('connecting');
    this.#channel.resetTime();
    try {
      const device = await this.#findDevice();
      if (generation !== this.#generation) return;
      this.#device = device;
      device.addEventListener('gattserverdisconnected', this.#onLinkLost);
      // Set before subscribing so the first measurement already has a reference.
      this.#startMs = this.#clock.nowMs();
      await this.#withTimeout(this.#subscribeMeasurements(device, () => generation === this.#generation));
      if (generation !== this.#generation) return;
      this.#channel.changeState('connected');
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.#release();
      if (cause instanceof DOMException && cause.name === 'NotFoundError' && this.#options.mode === 'choose') {
        // The user closed the chooser without picking a device.
        this.#channel.changeState('disconnected');
        return;
      }
      this.#channel.changeState('error');
      this.#channel.emitError(toConnectionError(cause));
    }
  }

  async disconnect(): Promise<void> {
    this.#generation++;
    const characteristic = this.#characteristic;
    this.#release();
    this.#channel.changeState('disconnected');
    if (characteristic !== null) {
      // The link may already be gone; stopping is best effort.
      await characteristic.stopNotifications().catch(() => undefined);
    }
  }

  async #findDevice(): Promise<BleDevice> {
    const { bluetooth, mode } = this.#options;
    if (mode === 'choose') {
      return bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] });
    }
    const devices = bluetooth.getDevices === undefined ? [] : await bluetooth.getDevices();
    const device = devices[0];
    if (device === undefined) {
      throw new BleConnectionError('no_remembered_device');
    }
    return device;
  }

  /** @param isCurrent tells whether this work still belongs to the live connection. */
  async #subscribeMeasurements(device: BleDevice, isCurrent: () => boolean): Promise<void> {
    if (device.gatt === undefined) {
      throw new BleConnectionError('no_gatt');
    }
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
    if (!isCurrent()) return;
    this.#characteristic?.removeEventListener('characteristicvaluechanged', this.#onMeasurement);
    this.#characteristic = characteristic;
    characteristic.addEventListener('characteristicvaluechanged', this.#onMeasurement);
    await characteristic.startNotifications();
  }

  readonly #onMeasurement = (event: Event): void => {
    const value = (event.target as HeartRateCharacteristic | null)?.value;
    if (value === undefined || value === null) return;
    try {
      const measurement = parseHeartRateMeasurement(value);
      this.#channel.notify({ timeMs: this.#clock.nowMs() - this.#startMs, ...measurement });
    } catch (error) {
      if (!(error instanceof HeartRateMeasurementError)) throw error;
      this.#channel.emitError(error);
    }
  };

  readonly #onLinkLost = (): void => {
    if (this.#channel.state !== 'connected') return;
    this.#attempt = 0;
    this.#channel.changeState('reconnecting');
    this.#scheduleRetry();
  };

  #scheduleRetry(): void {
    const waitMs = RECONNECT_DELAYS_MS[this.#attempt];
    if (waitMs === undefined) {
      this.#release();
      this.#channel.changeState('error');
      this.#channel.emitError(new BleConnectionError('link_lost'));
      return;
    }
    const generation = this.#generation;
    this.#cancelRetry = this.#delay.after(() => {
      this.#cancelRetry = null;
      void this.#retry(generation);
    }, waitMs);
  }

  async #retry(generation: number): Promise<void> {
    const device = this.#device;
    if (device === null || generation !== this.#generation) return;
    const attemptId = ++this.#attemptId;
    const isCurrent = (): boolean => generation === this.#generation && attemptId === this.#attemptId;
    try {
      await this.#withTimeout(this.#subscribeMeasurements(device, isCurrent));
      if (!isCurrent()) return;
      this.#attempt = 0;
      this.#channel.changeState('connected');
    } catch {
      if (!isCurrent()) return;
      // Aborts a connection attempt that may still be pending; a no-op when idle.
      device.gatt?.disconnect();
      this.#attempt++;
      this.#scheduleRetry();
    }
  }

  /**
   * Rejects when `work` takes longer than ATTEMPT_TIMEOUT_MS: some platforms
   * never settle `gatt.connect()`, which would leave the source reconnecting forever.
   */
  #withTimeout<T>(work: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cancel = this.#delay.after(() => {
        reject(new BleConnectionError('attempt_timed_out'));
      }, ATTEMPT_TIMEOUT_MS);
      work.then(
        (value) => { cancel(); resolve(value); },
        (error: unknown) => { cancel(); reject(error instanceof Error ? error : new Error(String(error))); },
      );
    });
  }

  #release(): void {
    this.#cancelRetry?.();
    this.#cancelRetry = null;
    this.#characteristic?.removeEventListener('characteristicvaluechanged', this.#onMeasurement);
    this.#characteristic = null;
    const device = this.#device;
    this.#device = null;
    if (device !== null) {
      device.removeEventListener('gattserverdisconnected', this.#onLinkLost);
      if (device.gatt?.connected === true) device.gatt.disconnect();
    }
  }
}

/** Classifies a failed connection; the browser reports its reasons as DOMException names. */
function toConnectionError(cause: unknown): BleConnectionError {
  if (cause instanceof BleConnectionError) return cause;
  if (cause instanceof DOMException && (cause.name === 'SecurityError' || cause.name === 'NotAllowedError')) {
    return new BleConnectionError('permission_denied', { cause });
  }
  if (cause instanceof DOMException && cause.name === 'NotFoundError') {
    return new BleConnectionError('device_unavailable', { cause });
  }
  return new BleConnectionError('connect_failed', { cause });
}
