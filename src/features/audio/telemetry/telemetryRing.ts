/**
 * Ring buffer over shared memory for audio thread telemetry. The audio
 * thread writes each block peak without messages or allocations; the main
 * thread reads whenever it wants.
 *
 * Layout: [0] total values written (Int32, with Atomics), followed by
 * CAPACITY Float32 values.
 */
export const TELEMETRY_CAPACITY = 512;
const HEADER_BYTES = 8;

export function createTelemetryBuffer(): SharedArrayBuffer {
  return new SharedArrayBuffer(HEADER_BYTES + TELEMETRY_CAPACITY * Float32Array.BYTES_PER_ELEMENT);
}

/** Audio thread side. */
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
    // The index is published after the value so the reader never reads half-written data.
    Atomics.store(this.#header, 0, (written + 1) | 0);
  }
}

export interface TelemetryReading {
  /** New blocks since the previous read. */
  readonly blocks: number;
  /** Maximum of the new values; `null` if there were no blocks. */
  readonly max: number | null;
}

/** Main thread side. */
export class TelemetryReader {
  readonly #header: Int32Array;
  readonly #data: Float32Array;
  #readCount = 0;

  constructor(buffer: SharedArrayBuffer) {
    this.#header = new Int32Array(buffer, 0, 2);
    this.#data = new Float32Array(buffer, HEADER_BYTES, TELEMETRY_CAPACITY);
  }

  /** Reads what was written since last time; if the writer wrapped around, only the most recent. */
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
