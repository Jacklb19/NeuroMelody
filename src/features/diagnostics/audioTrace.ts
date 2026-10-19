import type { EngineDiagnostic } from '../audio/engine/AudioEngine';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';

export const AUDIO_OUTPUT_IDS = ['direct', 'media'] as const;
export type AudioOutputId = (typeof AUDIO_OUTPUT_IDS)[number];
export const AUDIO_PROBE_MINUTES = 3;
export const AUDIO_TRACE_PERIOD_MS = 1000;
/** Bound memory even when a browser leaves the page running after the test ends. */
export const MAX_AUDIO_TRACE_ENTRIES = 360;
export const AUDIO_TRACE_FILE = 'neuromelody-audio.json';

export const AUDIO_TRACE_REASONS = ['started', 'sample', 'context', 'visible', 'hidden', 'stopped'] as const;
export type AudioTraceReason = (typeof AUDIO_TRACE_REASONS)[number];

export interface AudioTraceSetup {
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly output: AudioOutputId;
  readonly userAgent: string;
}

export interface AudioTraceEntry extends EngineDiagnostic {
  readonly reason: AudioTraceReason;
  readonly elapsedMs: number;
  readonly visibility: DocumentVisibilityState;
}

/** In-memory technical evidence. No account, physiology, storage or network access. */
export class AudioTrace {
  readonly #now: () => number;
  #startedAt = 0;
  #setup: AudioTraceSetup | null = null;
  #dropped = 0;
  #entries: AudioTraceEntry[] = [];

  constructor(now: () => number = () => performance.now()) {
    this.#now = now;
  }

  begin(setup: AudioTraceSetup): void {
    this.#startedAt = this.#now();
    this.#setup = setup;
    this.#dropped = 0;
    this.#entries = [];
  }

  get length(): number { return this.#entries.length; }

  capture(reason: AudioTraceReason, visibility: DocumentVisibilityState, reading: EngineDiagnostic): AudioTraceEntry {
    const entry: AudioTraceEntry = { ...reading, reason, visibility, elapsedMs: Math.max(0, this.#now() - this.#startedAt) };
    if (this.#entries.length === MAX_AUDIO_TRACE_ENTRIES) {
      this.#entries.shift();
      this.#dropped++;
    }
    this.#entries.push(entry);
    return entry;
  }

  serialize(): string {
    return JSON.stringify({ version: 1, setup: this.#setup, droppedEntries: this.#dropped, entries: this.#entries }, null, 2);
  }
}
