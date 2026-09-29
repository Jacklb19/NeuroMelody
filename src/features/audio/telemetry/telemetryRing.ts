/**
 * Búfer circular sobre memoria compartida para la telemetría del hilo de
 * audio. El hilo de audio escribe el pico de cada bloque sin mensajes ni
 * reservas de memoria; el hilo principal lee cuando quiere.
 *
 * Distribución: [0] muestras escritas en total (Int32, con Atomics), y a
 * continuación CAPACIDAD valores Float32.
 */
export const TELEMETRY_CAPACITY = 512;
const HEADER_BYTES = 8;

export function createTelemetryBuffer(): SharedArrayBuffer {
  return new SharedArrayBuffer(HEADER_BYTES + TELEMETRY_CAPACITY * Float32Array.BYTES_PER_ELEMENT);
}

/** Lado del hilo de audio. */
export class TelemetryWriter {
  readonly #header: Int32Array;
  readonly #data: Float32Array;

  constructor(buffer: SharedArrayBuffer) {
    this.#header = new Int32Array(buffer, 0, 2);
    this.#data = new Float32Array(buffer, HEADER_BYTES, TELEMETRY_CAPACITY);
  }

  write(value: number): void {
    const written = Atomics.load(this.#header, 0);
    this.#data[written % TELEMETRY_CAPACITY] = value;
    // Se publica el índice después del dato para que el lector nunca lea a medias.
    Atomics.store(this.#header, 0, (written + 1) | 0);
  }
}

export interface TelemetryReading {
  /** Bloques nuevos desde la lectura anterior. */
  readonly blocks: number;
  /** Máximo de los valores nuevos; `null` si no hubo bloques. */
  readonly max: number | null;
}

/** Lado del hilo principal. */
export class TelemetryReader {
  readonly #header: Int32Array;
  readonly #data: Float32Array;
  #readCount = 0;

  constructor(buffer: SharedArrayBuffer) {
    this.#header = new Int32Array(buffer, 0, 2);
    this.#data = new Float32Array(buffer, HEADER_BYTES, TELEMETRY_CAPACITY);
  }

  /** Lee lo escrito desde la última vez; si el escritor dio la vuelta, solo lo más reciente. */
  read(): TelemetryReading {
    const written = Atomics.load(this.#header, 0);
    const newCount = written - this.#readCount;
    const from = written - Math.min(newCount, TELEMETRY_CAPACITY);
    let max: number | null = null;
    for (let i = from; i < written; i++) {
      const value = this.#data[i % TELEMETRY_CAPACITY] ?? 0;
      max = max === null ? value : Math.max(max, value);
    }
    this.#readCount = written;
    return { blocks: newCount, max };
  }
}
