/**
 * Último eslabón de la cadena: recorte suave con techo de −1 dBFS (RF-18).
 * El compresor nativo no garantiza el máximo; este recorte sí. Publica el
 * pico de cada bloque en el búfer circular de telemetría.
 */
import { recortarBloque } from '../core/softClip';
import { EscritorTelemetria } from '../telemetry/telemetryRing';
import { ambito } from './workletScope';
import { NOMBRE_RECORTADOR, leerOpcionesRecortador } from './workletContract';

class ProcesadorRecortador extends ambito.AudioWorkletProcessor {
  readonly #telemetria: EscritorTelemetria | null;

  constructor(opciones: AudioWorkletNodeOptions) {
    super();
    const { telemetria } = leerOpcionesRecortador(opciones.processorOptions);
    this.#telemetria = telemetria === null ? null : new EscritorTelemetria(telemetria);
  }

  process(entradas: Float32Array[][], salidas: Float32Array[][]): boolean {
    const entrada = entradas[0];
    const salida = salidas[0];
    let pico = 0;
    if (salida !== undefined) {
      for (let c = 0; c < salida.length; c++) {
        const canalSalida = salida[c];
        const canalEntrada = entrada?.[c];
        if (canalSalida === undefined) {
          continue;
        }
        if (canalEntrada === undefined) {
          canalSalida.fill(0);
          continue;
        }
        canalSalida.set(canalEntrada);
        pico = Math.max(pico, recortarBloque(canalSalida));
      }
    }
    this.#telemetria?.escribir(pico);
    return true;
  }
}

ambito.registerProcessor(NOMBRE_RECORTADOR, ProcesadorRecortador);
