/**
 * Acceso tipado al ámbito global del AudioWorklet (`sampleRate`,
 * `registerProcessor`, `AudioWorkletProcessor`), que la biblioteca DOM de
 * TypeScript no declara. Leerlo desde `globalThis` evita declarar globales
 * que contaminarían los tipos del hilo principal, y permite sustituirlo en
 * las pruebas.
 */

export type ParametrosBloque = Record<string, Float32Array>;

export interface ProcesadorAudio {
  process(entradas: Float32Array[][], salidas: Float32Array[][], parametros: ParametrosBloque): boolean;
}

export type ClaseProcesador = new (opciones: AudioWorkletNodeOptions) => ProcesadorAudio;

interface AmbitoWorklet {
  readonly sampleRate: number;
  readonly AudioWorkletProcessor: new () => { readonly port: MessagePort };
  registerProcessor(nombre: string, clase: ClaseProcesador): void;
}

// La forma del ámbito la garantiza el navegador al cargar el módulo con
// audioWorklet.addModule(); aquí solo se le da tipo.
export const ambito = globalThis as unknown as AmbitoWorklet;

/** Valor del parámetro en el bloque (los de tasa k traen un solo valor). */
export function valorParametro(parametros: ParametrosBloque, nombre: string, porOmision: number): number {
  return parametros[nombre]?.[0] ?? porOmision;
}
