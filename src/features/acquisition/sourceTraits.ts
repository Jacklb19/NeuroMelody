import type { SourceKind } from './sourceCatalog';

/** What a source needs from the browser and which controls the selector offers for it. */
export interface SourceTraits {
  /** Needs Web Bluetooth: the selector disables it when the browser lacks it (RNF-10). */
  readonly requiresBluetooth: boolean;
  /** Plays signal time faster than real time, so the speed selector applies (RF-02). */
  readonly adjustableSpeed: boolean;
}

/** Traits of every source kind; keyed by the catalog so a new kind cannot be left out. */
export const SOURCE_TRAITS: Readonly<Record<SourceKind, SourceTraits>> = {
  simulator: { requiresBluetooth: false, adjustableSpeed: true },
  recording: { requiresBluetooth: false, adjustableSpeed: true },
  ble: { requiresBluetooth: true, adjustableSpeed: false },
};
