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
  /**
   * Does not measure the person: the simulator invents a pulse and the sample
   * recordings are somebody else's. They exist to try the app, are offered
   * apart from the real sources, and what is listened to with them is not kept.
   */
  readonly trial: boolean;
}

/** Traits of every source kind; keyed by the catalog so a new kind cannot be left out. */
export const SOURCE_TRAITS: Readonly<Record<SourceKind, SourceTraits>> = {
  simulator: { requiresBluetooth: false, requiresCamera: false, adjustableSpeed: true, experimental: false, trial: true },
  recording: { requiresBluetooth: false, requiresCamera: false, adjustableSpeed: true, experimental: false, trial: true },
  ble: { requiresBluetooth: true, requiresCamera: false, adjustableSpeed: false, experimental: false, trial: false },
  camera: { requiresBluetooth: false, requiresCamera: true, adjustableSpeed: false, experimental: true, trial: false },
};

/** Whether a session or a recording was made with a source that measures nobody. */
export function isTrialSource(kind: SourceKind | null): boolean {
  return kind !== null && SOURCE_TRAITS[kind].trial;
}
