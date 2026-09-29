import { agregarTramo } from './calidadSenal';
import type { LatidoClasificado, TramoBajaCalidad } from './tipos';
import { VENTANA_ANALISIS_MS } from './umbrales';

/**
 * Últimos 5 minutos de tiempo de señal: latidos clasificados y tramos de baja
 * calidad. Se mide en tiempo de señal, no de pared, para que el análisis sea
 * igual a cualquier velocidad del simulador.
 */
export class VentanaDeslizante {
  #latidos: LatidoClasificado[] = [];
  #tramos: TramoBajaCalidad[] = [];

  get latidos(): readonly LatidoClasificado[] {
    return this.#latidos;
  }

  get tramos(): readonly TramoBajaCalidad[] {
    return this.#tramos;
  }

  agregarLatido(latido: LatidoClasificado): void {
    this.#latidos.push(latido);
  }

  agregarTramo(tramo: TramoBajaCalidad): void {
    this.#tramos = agregarTramo(this.#tramos, tramo);
  }

  /** Descarta lo que quedó fuera de la ventana que termina en `tiempoActualMs`. */
  podar(tiempoActualMs: number): void {
    const limiteMs = tiempoActualMs - VENTANA_ANALISIS_MS;
    const primero = this.#latidos.findIndex((latido) => latido.finMs > limiteMs);
    this.#latidos = primero === -1 ? [] : this.#latidos.slice(primero);
    this.#tramos = this.#tramos.filter((tramo) => tramo.finMs > limiteMs);
  }

  vaciar(): void {
    this.#latidos = [];
    this.#tramos = [];
  }
}
