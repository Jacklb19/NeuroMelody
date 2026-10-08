import type { SourceKind } from './sourceCatalog';

/** What a source needs from the browser and which controls the selector offers for it. */
export interface SourceTraits {
  /** Needs Web Bluetooth: the selector disables it when the browser lacks it (RNF-10). */
  readonly requiresBluetooth: boolean;
  /** Needs the camera API: the selector disables it when the browser lacks it. */
  readonly requiresCamera: boolean;
  /** Plays signal time faster than real time, so the speed selector applies (RF-02). */
  readonly adjustableSpeed: boolean;
  /** Not yet validated against a strap (proposal P-01): the selector says so next to its name. */
  readonly experimental: boolean;
}

/** Traits of every source kind; keyed by the catalog so a new kind cannot be left out. */
export const SOURCE_TRAITS: Readonly<Record<SourceKind, SourceTraits>> = {
  simulator: { requiresBluetooth: false, requiresCamera: false, adjustableSpeed: true, experimental: false },
  recording: { requiresBluetooth: false, requiresCamera: false, adjustableSpeed: true, experimental: false },
  ble: { requiresBluetooth: true, requiresCamera: false, adjustableSpeed: false, experimental: false },
  camera: { requiresBluetooth: false, requiresCamera: true, adjustableSpeed: false, experimental: true },
};
