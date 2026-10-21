import type { EngineDiagnostic } from '../audio/engine/AudioEngine';
import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import { MS_PER_SECOND } from '../../shared/time';

export const AUDIO_OUTPUT_IDS = ['direct', 'media'] as const;
export type AudioOutputId = (typeof AUDIO_OUTPUT_IDS)[number];
/** Latencies the browser can be asked for; sessions use `playback` (browserFactory). */
export const AUDIO_LATENCY_IDS = ['playback', 'balanced', 'interactive'] as const satisfies readonly AudioContextLatencyCategory[];
export type AudioLatencyId = (typeof AUDIO_LATENCY_IDS)[number];
export const AUDIO_REVERB_IDS = ['on', 'off'] as const;
export type AudioReverbId = (typeof AUDIO_REVERB_IDS)[number];
export const AUDIO_PROBE_MINUTES = 3;
export const AUDIO_TRACE_PERIOD_MS = 1000;
/** Bound memory even when a browser leaves the page running after the test ends. */
export const MAX_AUDIO_TRACE_ENTRIES = 360;
export const AUDIO_TRACE_FILE = 'neuromelody-audio.json';
/** Shorter gaps between readings say more about the timer than about the audio. */
export const MIN_CLOCK_INTERVAL_MS = 500;

export const AUDIO_TRACE_REASONS = ['started', 'sample', 'context', 'visible', 'hidden', 'frozen', 'resumed', 'pagehide', 'pageshow', 'stopped'] as const;
export type AudioTraceReason = (typeof AUDIO_TRACE_REASONS)[number];

export interface AudioTraceSetup {
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly output: AudioOutputId;
  readonly latency: AudioLatencyId;
  readonly reverb: AudioReverbId;
  readonly userAgent: string;
  /** Logical processors the browser reports; `null` when it does not say. */
  readonly processors: number | null;
}

export interface AudioTraceEntry extends EngineDiagnostic {
  readonly reason: AudioTraceReason;
  readonly elapsedMs: number;
  readonly visibility: DocumentVisibilityState;
}

/** How fast the audio clock moved against the wall clock while the page was in one visibility. */
export interface ClockPace {
  readonly wallMs: number;
  readonly audioMs: number;
  /** Audio time over wall time: 1 is real time; less means the audio fell behind. */
  readonly ratio: number | null;
  /** The slowest interval between two readings, with the same meaning. */
  readonly slowest: number | null;
}

export type ClockSummary = Readonly<Record<DocumentVisibilityState, ClockPace>>;

/**
 * Compares the audio clock with the wall clock between consecutive readings,
 * grouped by the visibility the page had during each interval. Intervals
 * that start with the context not running are left out: a paused clock is
 * expected there and is already recorded as a context change.
 */
export function clockSummary(entries: readonly AudioTraceEntry[]): ClockSummary {
  const totals = { visible: { wallMs: 0, audioMs: 0, slowest: Number.POSITIVE_INFINITY }, hidden: { wallMs: 0, audioMs: 0, slowest: Number.POSITIVE_INFINITY } };
  for (let index = 1; index < entries.length; index++) {
    const from = entries[index - 1];
    const to = entries[index];
    if (from === undefined || to === undefined || from.contextState !== 'running') continue;
    const wallMs = to.elapsedMs - from.elapsedMs;
    if (wallMs < MIN_CLOCK_INTERVAL_MS) continue;
    const audioMs = (to.audioTimeS - from.audioTimeS) * MS_PER_SECOND;
    const total = totals[from.visibility];
    total.wallMs += wallMs;
    total.audioMs += audioMs;
    total.slowest = Math.min(total.slowest, audioMs / wallMs);
  }
  const pace = (total: (typeof totals)['visible']): ClockPace => ({
    wallMs: total.wallMs,
    audioMs: total.audioMs,
    ratio: total.wallMs === 0 ? null : total.audioMs / total.wallMs,
    slowest: Number.isFinite(total.slowest) ? total.slowest : null,
  });
  return { visible: pace(totals.visible), hidden: pace(totals.hidden) };
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

  /** The pace of the audio clock so far, by visibility. */
  get clock(): ClockSummary { return clockSummary(this.#entries); }

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
    return JSON.stringify({ version: 2, setup: this.#setup, droppedEntries: this.#dropped, clock: this.clock, entries: this.#entries }, null, 2);
  }
}
