/**
 * Aceptación de las advertencias de uso (RF-17). Se guarda en el dispositivo
 * con localStorage; en el S6 se sincroniza con `profiles.warnings_accepted_at`.
 *
 * Si el almacenamiento falla (por ejemplo, en navegación privada), la
 * lectura se trata como "no aceptadas" y las advertencias se vuelven a
 * pedir; la aceptación vale solo para la visita en curso.
 */
export const CLAVE_ADVERTENCIAS = 'neuromelody.advertencias-aceptadas';

export type AlmacenClaveValor = Pick<Storage, 'getItem' | 'setItem'>;

export class RegistroAdvertencias {
  readonly #almacen: AlmacenClaveValor | null;
  #aceptadasEnEstaVisita = false;

  constructor(almacen: AlmacenClaveValor | null) {
    this.#almacen = almacen;
  }

  aceptadas(): boolean {
    if (this.#aceptadasEnEstaVisita) {
      return true;
    }
    try {
      return this.#almacen?.getItem(CLAVE_ADVERTENCIAS) != null;
    } catch {
      return false;
    }
  }

  /** @returns `true` si la aceptación quedó guardada en el dispositivo. */
  aceptar(fecha: Date): boolean {
    this.#aceptadasEnEstaVisita = true;
    try {
      if (this.#almacen === null) {
        return false;
      }
      this.#almacen.setItem(CLAVE_ADVERTENCIAS, fecha.toISOString());
      return true;
    } catch {
      return false;
    }
  }
}

/** Almacén del navegador; el propio acceso a `localStorage` puede lanzar un error. */
export function almacenDelNavegador(): AlmacenClaveValor | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
