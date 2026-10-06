import type { BeatNotification } from '../../acquisition/contract';
import { isAcceptanceLow } from './signalQuality';
import { BeatFilter } from '../../signal/processing/BeatFilter';
import { computeTimeDomainIndices } from './timeDomainIndices';
import type { ClassifiedBeat, LowQualitySegment } from './types';
import {
  MAX_GAP_MS,
  MIN_NN_FOR_INDICES_MS,
  COMPUTE_PERIOD_MS,
  ANALYSIS_WINDOW_MS,
} from './thresholds';
import { SlidingWindow } from './SlidingWindow';

/** Estado de la señal que ve el usuario (siempre en lenguaje descriptivo). */
export type SignalQuality = 'collecting' | 'good' | 'low';

/** Resultado publicado cada 5 s de señal (RF-05). */
export interface IndicesResult {
  readonly timeMs: number;
  /** Los índices son `null` mientras no haya 60 s de NN válidos en la ventana. */
  readonly meanHr: number | null;
  readonly rmssd: number | null;
  readonly sdnn: number | null;
  readonly nnDurationMs: number;
  /** Parte de la ventana de 5 min ya cubierta por la señal. */
  readonly coverageMs: number;
  readonly acceptedBeats: number;
  readonly discardedBeats: number;
  readonly quality: SignalQuality;
}

/** Contenido de la ventana, para dibujarlo. */
export interface WindowSnapshot {
  readonly timeMs: number;
  readonly beats: readonly ClassifiedBeat[];
  readonly segments: readonly LowQualitySegment[];
}

/**
 * Procesamiento completo del hilo de señal, sin dependencias del Worker para
 * poder probarlo de forma determinista.
 *
 * Por cada notificación: clasifica los RR (RF-04), marca huecos, pérdidas de
 * contacto y tramos con poca aceptación, y mantiene la ventana de 5 min.
 * Cada vez que el tiempo de señal cruza un múltiplo de 5 s publica los
 * índices (RF-05). La cadencia depende del tiempo de señal y no de
 * temporizadores, así que es la misma a cualquier velocidad.
 */
export class SignalProcessor {
  readonly #onIndices: (result: IndicesResult) => void;
  readonly #filter = new BeatFilter();
  readonly #slidingWindow = new SlidingWindow();
  #lastTimeMs = 0;
  #lastRrMs = 0;
  #nextComputeMs = COMPUTE_PERIOD_MS;
  /** Hubo un hueco o pérdida de contacto desde el último latido. */
  #continuityBroken = false;
  #lowNow = false;

  constructor(onIndices: (result: IndicesResult) => void) {
    this.#onIndices = onIndices;
  }

  get snapshot(): WindowSnapshot {
    return {
      timeMs: this.#lastTimeMs,
      beats: this.#slidingWindow.beats,
      segments: this.#slidingWindow.segments,
    };
  }

  process(notification: BeatNotification): void {
    const { timeMs } = notification;
    const previousMs = this.#lastTimeMs;
    let low = false;

    if (timeMs - this.#lastRrMs > MAX_GAP_MS) {
      this.#slidingWindow.addSegment({ startMs: this.#lastRrMs, endMs: timeMs });
      this.#continuityBroken = true;
      low = true;
    }

    if (notification.sensorContact === false) {
      this.#slidingWindow.addSegment({ startMs: previousMs, endMs: timeMs });
      this.#continuityBroken = true;
      low = true;
      this.#addBeats(notification, () => ({
        accepted: false,
        discardReason: 'no_contact',
      }));
    } else if (notification.rrIntervalsMs.length > 0) {
      this.#addBeats(notification, (rr) => this.#filter.classify(rr));
      this.#lastRrMs = timeMs;
    }

    if (isAcceptanceLow(this.#slidingWindow.beats, timeMs)) {
      this.#slidingWindow.addSegment({ startMs: previousMs, endMs: timeMs });
      low = true;
    }

    this.#lowNow = low;
    this.#lastTimeMs = timeMs;
    this.#slidingWindow.prune(timeMs);

    if (timeMs >= this.#nextComputeMs) {
      this.#onIndices(this.#compute(timeMs));
      while (this.#nextComputeMs <= timeMs) {
        this.#nextComputeMs += COMPUTE_PERIOD_MS;
      }
    }
  }

  /** Vuelve al estado inicial; se usa al iniciar una nueva conexión. */
  reset(): void {
    this.#filter.reset();
    this.#slidingWindow.clear();
    this.#lastTimeMs = 0;
    this.#lastRrMs = 0;
    this.#nextComputeMs = COMPUTE_PERIOD_MS;
    this.#continuityBroken = false;
    this.#lowNow = false;
  }

  /**
   * La notificación no dice cuándo terminó cada latido, solo que terminaron
   * antes de ella: se asume que el último termina en el instante de la
   * notificación y los anteriores se ubican hacia atrás (error < 1 s).
   */
  #addBeats(
    notification: BeatNotification,
    classify: (rrMs: number) => Pick<ClassifiedBeat, 'accepted' | 'discardReason'>,
  ): void {
    const rr = notification.rrIntervalsMs;
    let endMs = notification.timeMs - rr.reduce((sum, value) => sum + value, 0);
    for (const rrMs of rr) {
      endMs += rrMs;
      this.#slidingWindow.addBeat({
        endMs,
        rrMs,
        ...classify(rrMs),
        contiguousWithPrevious: !this.#continuityBroken,
      });
      this.#continuityBroken = false;
    }
  }

  #compute(timeMs: number): IndicesResult {
    const beats = this.#slidingWindow.beats;
    const indices = computeTimeDomainIndices(beats);
    const enough = indices.nnDurationMs >= MIN_NN_FOR_INDICES_MS;
    let quality: SignalQuality = enough ? 'good' : 'collecting';
    if (this.#lowNow) {
      quality = 'low';
    }
    return {
      timeMs,
      meanHr: enough ? indices.meanHr : null,
      rmssd: enough ? indices.rmssd : null,
      sdnn: enough ? indices.sdnn : null,
      nnDurationMs: indices.nnDurationMs,
      coverageMs: Math.min(timeMs, ANALYSIS_WINDOW_MS),
      acceptedBeats: indices.validNn,
      discardedBeats: beats.length - indices.validNn,
      quality,
    };
  }
}
