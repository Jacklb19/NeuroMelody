/**
 * Typed access to the AudioWorklet global scope (`sampleRate`,
 * `registerProcessor`, `AudioWorkletProcessor`), which the TypeScript DOM
 * library does not declare. Reading it from `globalThis` avoids declaring
 * globals that would pollute the main thread types, and lets tests replace
 * it.
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

// The browser guarantees the scope shape when it loads the module with
// audioWorklet.addModule(); here it only gets a type.
export const scope = globalThis as unknown as WorkletScope;

/** Parameter value in the block (k-rate parameters carry a single value). */
export function paramValue(params: BlockParams, name: string, fallback: number): number {
  return params[name]?.[0] ?? fallback;
}
