/**
 * Aceptación de las advertencias de uso (RF-17). Se guarda en el dispositivo
 * con localStorage; en el S6 se sincroniza con `profiles.warnings_accepted_at`.
 *
 * Si el almacenamiento falla (por ejemplo, en navegación privada), la
 * lectura se trata como "no aceptadas" y las advertencias se vuelven a
 * pedir; la aceptación vale solo para la visita en curso.
 */
export const WARNINGS_STORAGE_KEY = 'neuromelody.advertencias-aceptadas';

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

  /** @returns `true` si la aceptación quedó guardada en el dispositivo. */
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

/** Almacén del navegador; el propio acceso a `localStorage` puede lanzar un error. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
