import { addSegment } from './signalQuality';
import type { ClassifiedBeat, LowQualitySegment } from './types';
import { ANALYSIS_WINDOW_MS } from './thresholds';

/**
 * Últimos 5 minutos de tiempo de señal: latidos clasificados y tramos de baja
 * calidad. Se mide en tiempo de señal, no de pared, para que el análisis sea
 * igual a cualquier velocidad del simulador.
 */
export class SlidingWindow {
  #beats: ClassifiedBeat[] = [];
  #segments: LowQualitySegment[] = [];

  get beats(): readonly ClassifiedBeat[] {
    return this.#beats;
  }

  get segments(): readonly LowQualitySegment[] {
    return this.#segments;
  }

  addBeat(beat: ClassifiedBeat): void {
    this.#beats.push(beat);
  }

  addSegment(segment: LowQualitySegment): void {
    this.#segments = addSegment(this.#segments, segment);
  }

  /** Descarta lo que quedó fuera de la ventana que termina en `tiempoActualMs`. */
  prune(currentTimeMs: number): void {
    const limitMs = currentTimeMs - ANALYSIS_WINDOW_MS;
    const first = this.#beats.findIndex((beat) => beat.endMs > limitMs);
    this.#beats = first === -1 ? [] : this.#beats.slice(first);
    this.#segments = this.#segments.filter((segment) => segment.endMs > limitMs);
  }

  clear(): void {
    this.#beats = [];
    this.#segments = [];
  }
}
