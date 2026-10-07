/**
 * Minimal slice of the Web Bluetooth API used by the BLE source.
 *
 * TypeScript's DOM library does not ship these types, and the project avoids
 * a types package for the handful of members it needs. Declaring them here
 * also lets tests inject a fake GATT server.
 */

/** Standard Heart Rate Service and its measurement characteristic (RF-01, RF-03). */
export const HEART_RATE_SERVICE = 'heart_rate';
export const HEART_RATE_MEASUREMENT = 'heart_rate_measurement';

export interface HeartRateCharacteristic extends EventTarget {
  /** Last value received; set before `characteristicvaluechanged` fires. */
  readonly value?: DataView | null;
  startNotifications(): Promise<unknown>;
  stopNotifications(): Promise<unknown>;
}

export interface GattService {
  getCharacteristic(characteristic: string): Promise<HeartRateCharacteristic>;
}

export interface GattServer {
  readonly connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<GattService>;
}

/** A device that emits `gattserverdisconnected` when the link drops. */
export interface BleDevice extends EventTarget {
  readonly gatt?: GattServer;
}

export interface BluetoothAdapter {
  requestDevice(options: {
    readonly filters: readonly { readonly services: readonly string[] }[];
  }): Promise<BleDevice>;
  /** Devices the user already authorised; only some browsers expose it. */
  getDevices?: () => Promise<BleDevice[]>;
}

/** The browser's Bluetooth adapter, or `null` when Web Bluetooth is missing (RNF-10). */
export function browserBluetooth(): BluetoothAdapter | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const { bluetooth } = navigator as Navigator & { bluetooth?: BluetoothAdapter };
  return bluetooth ?? null;
}
