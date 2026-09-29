/**
 * Búfer circular sobre memoria compartida para la telemetría del hilo de
 * audio. El hilo de audio escribe el pico de cada bloque sin mensajes ni
 * reservas de memoria; el hilo principal lee cuando quiere.
 *
 * Distribución: [0] muestras escritas en total (Int32, con Atomics), y a
 * continuación CAPACIDAD valores Float32.
 */
export const CAPACIDAD_TELEMETRIA = 512;
const BYTES_CABECERA = 8;

export function crearBuferTelemetria(): SharedArrayBuffer {
  return new SharedArrayBuffer(BYTES_CABECERA + CAPACIDAD_TELEMETRIA * Float32Array.BYTES_PER_ELEMENT);
}

/** Lado del hilo de audio. */
export class EscritorTelemetria {
  readonly #cabecera: Int32Array;
  readonly #datos: Float32Array;

  constructor(bufer: SharedArrayBuffer) {
    this.#cabecera = new Int32Array(bufer, 0, 2);
    this.#datos = new Float32Array(bufer, BYTES_CABECERA, CAPACIDAD_TELEMETRIA);
  }

  escribir(valor: number): void {
    const escritos = Atomics.load(this.#cabecera, 0);
    this.#datos[escritos % CAPACIDAD_TELEMETRIA] = valor;
    // Se publica el índice después del dato para que el lector nunca lea a medias.
    Atomics.store(this.#cabecera, 0, (escritos + 1) | 0);
  }
}

export interface LecturaTelemetria {
  /** Bloques nuevos desde la lectura anterior. */
  readonly bloques: number;
  /** Máximo de los valores nuevos; `null` si no hubo bloques. */
  readonly maximo: number | null;
}

/** Lado del hilo principal. */
export class LectorTelemetria {
  readonly #cabecera: Int32Array;
  readonly #datos: Float32Array;
  #leidos = 0;

  constructor(bufer: SharedArrayBuffer) {
    this.#cabecera = new Int32Array(bufer, 0, 2);
    this.#datos = new Float32Array(bufer, BYTES_CABECERA, CAPACIDAD_TELEMETRIA);
  }

  /** Lee lo escrito desde la última vez; si el escritor dio la vuelta, solo lo más reciente. */
  leer(): LecturaTelemetria {
    const escritos = Atomics.load(this.#cabecera, 0);
    const nuevos = escritos - this.#leidos;
    const desde = escritos - Math.min(nuevos, CAPACIDAD_TELEMETRIA);
    let maximo: number | null = null;
    for (let i = desde; i < escritos; i++) {
      const valor = this.#datos[i % CAPACIDAD_TELEMETRIA] ?? 0;
      maximo = maximo === null ? valor : Math.max(maximo, valor);
    }
    this.#leidos = escritos;
    return { bloques: nuevos, maximo };
  }
}
