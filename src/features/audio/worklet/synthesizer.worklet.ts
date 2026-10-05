/**
 * AudioWorklet processor that synthesizes the music (RF-08). A thin adapter
 * over SynthesisCore: it reads the block AudioParams and copies the channel to
 * the others. It does not allocate in `process()`.
 */
import { SynthesisCore } from '../core/SynthesisCore';
import { scope, paramValue, type BlockParams } from './workletScope';
import {
  SYNTHESIZER_DESCRIPTORS,
  SYNTHESIZER_NAME,
  readSynthesizerOptions,
} from './workletContract';

class SynthesizerProcessor extends scope.AudioWorkletProcessor {
  static get parameterDescriptors(): typeof SYNTHESIZER_DESCRIPTORS {
    return SYNTHESIZER_DESCRIPTORS;
  }

  readonly #core: SynthesisCore;

  constructor(options: AudioWorkletNodeOptions) {
    super();
    const { seed, initialMode, initialLayers } = readSynthesizerOptions(options.processorOptions);
    this.#core = new SynthesisCore(scope.sampleRate, seed, initialMode);
    this.#core.setInitialLayers(initialLayers);
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][], params: BlockParams): boolean {
    const output = outputs[0];
    const channel = output?.[0];
    if (output === undefined || channel === undefined) {
      return true;
    }
    this.#core.process(
      channel,
      paramValue(params, 'tempo', 66),
      paramValue(params, 'mode', 1),
      paramValue(params, 'layers', 2),
    );
    for (let c = 1; c < output.length; c++) {
      output[c]?.set(channel);
    }
    return true;
  }
}

scope.registerProcessor(SYNTHESIZER_NAME, SynthesizerProcessor);
