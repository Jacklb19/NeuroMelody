/**
 * Acceso tipado al ámbito global del AudioWorklet (`sampleRate`,
 * `registerProcessor`, `AudioWorkletProcessor`), que la biblioteca DOM de
 * TypeScript no declara. Leerlo desde `globalThis` evita declarar globales
 * que contaminarían los tipos del hilo principal, y permite sustituirlo en
 * las pruebas.
 */

export type BlockParams = Record<string, Float32Array>;

export interface AudioProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][], params: BlockParams): boolean;
}

export type ProcessorClass = new (options: AudioWorkletNodeOptions) => AudioProcessor;

interface WorkletScope {
  readonly sampleRate: number;
  readonly AudioWorkletProcessor: new () => { readonly port: MessagePort };
  registerProcessor(name: string, processorClass: ProcessorClass): void;
}

// La forma del ámbito la garantiza el navegador al cargar el módulo con
// audioWorklet.addModule(); aquí solo se le da tipo.
export const scope = globalThis as unknown as WorkletScope;

/** Valor del parámetro en el bloque (los de tasa k traen un solo valor). */
export function paramValue(params: BlockParams, name: string, fallback: number): number {
  return params[name]?.[0] ?? fallback;
}
