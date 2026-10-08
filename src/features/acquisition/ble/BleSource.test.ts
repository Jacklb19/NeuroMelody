import { describe, expect, it, vi } from 'vitest';
import type { BeatNotification, ConnectionState } from '../contract';
import { ATTEMPT_TIMEOUT_MS, RECONNECT_DELAYS_MS } from '../config';
import { BleConnectionError, BleSource, type Delay } from './BleSource';
import { HeartRateMeasurementError } from './parseHeartRateMeasurement';
import type { BleDevice, BluetoothAdapter, GattServer, HeartRateCharacteristic } from './webBluetooth';

function bytes(hex: string): DataView {
  const values = hex.split(' ').map((pair) => Number.parseInt(pair, 16));
  return new DataView(new Uint8Array(values).buffer);
}

class FakeCharacteristic extends EventTarget implements HeartRateCharacteristic {
  value: DataView | null = null;
  notifying = false;
  startNotifications(): Promise<unknown> {
    this.notifying = true;
    return Promise.resolve(this);
  }
  stopNotifications(): Promise<unknown> {
    this.notifying = false;
    return Promise.resolve(this);
  }
  send(hex: string): void {
    this.value = bytes(hex);
    this.dispatchEvent(new Event('characteristicvaluechanged'));
  }
}

class FakeDevice extends EventTarget implements BleDevice {
  readonly characteristic = new FakeCharacteristic();
  available = true;
  /** Simulates a platform where `gatt.connect()` never settles. */
  hangs = false;
  connected = false;
  readonly gatt: GattServer;

  constructor() {
    super();
    const isConnected = (): boolean => this.connected;
    const server: GattServer = {
      get connected() { return isConnected(); },
      connect: () => {
        if (this.hangs) return new Promise<GattServer>(() => undefined);
        if (!this.available) return Promise.reject(new DOMException('Out of range', 'NetworkError'));
        this.connected = true;
        return Promise.resolve(server);
      },
      disconnect: () => { this.connected = false; },
      getPrimaryService: () => Promise.resolve({
        getCharacteristic: () => Promise.resolve(this.characteristic),
      }),
    };
    this.gatt = server;
  }

  dropLink(): void {
    this.connected = false;
    this.dispatchEvent(new Event('gattserverdisconnected'));
  }
}

function createFakeDelay() {
  const pending: { task: () => void; delayMs: number }[] = [];
  const delay: Delay = {
    after: (task, delayMs) => {
      const entry = { task, delayMs };
      pending.push(entry);
      return () => { pending.splice(pending.indexOf(entry), 1); };
    },
  };
  return {
    delay,
    pending,
    async fireNext(): Promise<number | undefined> {
      const entry = pending.shift();
      entry?.task();
      await flush();
      return entry?.delayMs;
    },
  };
}

const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0); });

function setup(mode: 'choose' | 'remembered' = 'choose') {
  const device = new FakeDevice();
  let now = 10_000;
  const requestDevice = vi.fn<BluetoothAdapter['requestDevice']>(() => Promise.resolve(device));
  const bluetooth: BluetoothAdapter = {
    requestDevice,
    getDevices: () => Promise.resolve([device]),
  };
  const timers = createFakeDelay();
  const source = new BleSource({ bluetooth, mode, clock: { nowMs: () => now }, delay: timers.delay });
  const states: ConnectionState[] = [];
  const notifications: BeatNotification[] = [];
  const errors: Error[] = [];
  source.subscribe({
    onStateChange: (state) => states.push(state),
    onNotification: (n) => notifications.push(n),
    onError: (e) => errors.push(e),
  });
  return { device, requestDevice, source, states, notifications, errors, timers, advance: (ms: number) => { now += ms; } };
}

describe('BleSource', () => {
  it('requests a heart rate device and turns measurements into notifications', async () => {
    const { requestDevice, device, source, states, notifications, advance } = setup();
    await source.connect();

    expect(requestDevice).toHaveBeenCalledWith({ filters: [{ services: ['heart_rate'] }] });
    expect(states).toEqual(['connecting', 'connected']);
    expect(device.characteristic.notifying).toBe(true);

    advance(1000);
    device.characteristic.send('16 3C 00 04 10 04');
    expect(notifications).toEqual([
      { timeMs: 1000, heartRate: 60, sensorContact: true, rrIntervalsMs: [1000, 1015.625] },
    ]);
  });

  it('reports a malformed measurement without stopping the source', async () => {
    const { device, source, errors, notifications } = setup();
    await source.connect();
    device.characteristic.send('16 3C 00');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(HeartRateMeasurementError);
    expect(errors[0]).toHaveProperty('code', 'truncated_rr');
    expect(source.state).toBe('connected');
    expect(notifications).toHaveLength(0);
  });

  it('returns to disconnected when the user closes the chooser', async () => {
    const { requestDevice, source, states, errors } = setup();
    requestDevice.mockRejectedValueOnce(new DOMException('cancelled', 'NotFoundError'));
    await source.connect();
    expect(states).toEqual(['connecting', 'disconnected']);
    expect(errors).toEqual([]);
  });

  it('reconnects with 1, 2, 4 and 8 s waits and keeps signal time running', async () => {
    const { device, source, states, timers, notifications, advance } = setup();
    await source.connect();
    device.available = false;
    device.dropLink();
    expect(source.state).toBe('reconnecting');

    expect(await timers.fireNext()).toBe(1000);
    expect(await timers.fireNext()).toBe(2000);
    device.available = true;
    expect(await timers.fireNext()).toBe(4000);
    expect(source.state).toBe('connected');
    expect(states).toEqual(['connecting', 'connected', 'reconnecting', 'connected']);

    advance(30_000);
    device.characteristic.send('16 3C 00 04');
    expect(notifications.at(-1)?.timeMs).toBe(30_000);
  });

  it('keeps retrying for about one minute before giving up', () => {
    const totalMs = RECONNECT_DELAYS_MS.reduce((sum, delayMs) => sum + delayMs, 0);
    expect(RECONNECT_DELAYS_MS.slice(0, 4)).toEqual([1000, 2000, 4000, 8000]);
    expect(totalMs).toBeGreaterThanOrEqual(60_000);
  });

  it('abandons a hung attempt after the timeout and tries again', async () => {
    const { device, source, timers } = setup();
    await source.connect();
    device.hangs = true;
    device.dropLink();

    expect(await timers.fireNext()).toBe(1000);
    expect(timers.pending.map((entry) => entry.delayMs)).toEqual([ATTEMPT_TIMEOUT_MS]);
    expect(await timers.fireNext()).toBe(ATTEMPT_TIMEOUT_MS);
    expect(source.state).toBe('reconnecting');
    expect(timers.pending.map((entry) => entry.delayMs)).toEqual([2000]);

    device.hangs = false;
    expect(await timers.fireNext()).toBe(2000);
    expect(source.state).toBe('connected');
  });

  it('gives up with an error after the last attempt', async () => {
    const { device, source, timers, errors } = setup();
    await source.connect();
    device.available = false;
    device.dropLink();
    const waits: (number | undefined)[] = [];
    for (let i = 0; i < RECONNECT_DELAYS_MS.length; i++) waits.push(await timers.fireNext());

    expect(waits).toEqual([...RECONNECT_DELAYS_MS]);
    expect(source.state).toBe('error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(BleConnectionError);
    expect(errors[0]).toHaveProperty('code', 'link_lost');
    expect(timers.pending).toHaveLength(0);
  });

  it('does not retry after the user disconnects', async () => {
    const { device, source, timers } = setup();
    await source.connect();
    device.dropLink();
    await source.disconnect();
    expect(source.state).toBe('disconnected');
    expect(timers.pending).toHaveLength(0);
    expect(device.characteristic.notifying).toBe(false);
  });

  it('reuses a remembered strap without opening the chooser', async () => {
    const { requestDevice, source } = setup('remembered');
    await source.connect();
    expect(requestDevice).not.toHaveBeenCalled();
    expect(source.state).toBe('connected');
  });
});
