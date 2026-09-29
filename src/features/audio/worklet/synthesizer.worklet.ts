/**
 * Procesador del AudioWorklet que sintetiza la música (RF-08). Adaptador fino
 * sobre NucleoSintesis: lee los AudioParam del bloque y copia el canal a los
 * demás. No reserva memoria en `process()`.
 */
import { NucleoSintesis } from '../core/SynthesisCore';
import { ambito, valorParametro, type ParametrosBloque } from './workletScope';
import {
  DESCRIPTORES_SINTETIZADOR,
  NOMBRE_SINTETIZADOR,
  leerOpcionesSintetizador,
} from './workletContract';

class ProcesadorSintetizador extends ambito.AudioWorkletProcessor {
  static get parameterDescriptors(): typeof DESCRIPTORES_SINTETIZADOR {
    return DESCRIPTORES_SINTETIZADOR;
  }

  readonly #nucleo: NucleoSintesis;

  constructor(opciones: AudioWorkletNodeOptions) {
    super();
    const { semilla, modoInicial, capasIniciales } = leerOpcionesSintetizador(opciones.processorOptions);
    this.#nucleo = new NucleoSintesis(ambito.sampleRate, semilla, modoInicial);
    this.#nucleo.fijarCapasIniciales(capasIniciales);
  }

  process(_entradas: Float32Array[][], salidas: Float32Array[][], parametros: ParametrosBloque): boolean {
    const salida = salidas[0];
    const canal = salida?.[0];
    if (salida === undefined || canal === undefined) {
      return true;
    }
    this.#nucleo.procesar(
      canal,
      valorParametro(parametros, 'tempo', 66),
      valorParametro(parametros, 'modo', 1),
      valorParametro(parametros, 'capas', 2),
    );
    for (let c = 1; c < salida.length; c++) {
      salida[c]?.set(canal);
    }
    return true;
  }
}

ambito.registerProcessor(NOMBRE_SINTETIZADOR, ProcesadorSintetizador);
