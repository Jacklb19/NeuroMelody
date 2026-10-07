/**
 * Acceptance of the usage warnings (RF-17). It is stored on the device with
 * localStorage; in S6 it is synced with `profiles.warnings_accepted_at`.
 *
 * If storage fails (for example, in private browsing), the read is treated
 * as "not accepted" and the warnings are requested again; the acceptance
 * only holds for the current visit.
 */
export const WARNINGS_STORAGE_KEY = 'neuromelody.warnings-accepted';

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export class WarningsRegistry {
  readonly #storage: KeyValueStorage | null;
  #acceptedThisVisit = false;

  constructor(storage: KeyValueStorage | null) {
    this.#storage = storage;
  }

  isAccepted(): boolean {
    if (this.#acceptedThisVisit) {
      return true;
    }
    try {
      return this.#storage?.getItem(WARNINGS_STORAGE_KEY) != null;
    } catch {
      return false;
    }
  }

  /** @returns `true` if the acceptance was stored on the device. */
  accept(date: Date): boolean {
    this.#acceptedThisVisit = true;
    try {
      if (this.#storage === null) {
        return false;
      }
      this.#storage.setItem(WARNINGS_STORAGE_KEY, date.toISOString());
      return true;
    } catch {
      return false;
    }
  }
}

/** Browser storage; merely accessing `localStorage` can throw. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
