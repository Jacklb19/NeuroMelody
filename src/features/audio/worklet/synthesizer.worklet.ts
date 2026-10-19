/**
 * AudioWorklet processor that synthesizes the music (RF-08) and, on a second
 * output, the ambience of the session (ADR-40). A thin adapter over
 * SynthesisCore and Ambience: it reads the block AudioParams and hands them
 * the left and right channels. It does not allocate in `process()`.
 */
import { Ambience } from '../core/ambience';
import { SynthesisCore } from '../core/SynthesisCore';
import { scope, paramValue, type BlockParams } from './workletScope';
import {
  SYNTHESIZER_DEFAULTS,
  SYNTHESIZER_DESCRIPTORS,
  SYNTHESIZER_NAME,
  SYNTHESIZER_OUTPUT,
  readSynthesizerOptions,
} from './workletContract';

class SynthesizerProcessor extends scope.AudioWorkletProcessor {
  static get parameterDescriptors(): typeof SYNTHESIZER_DESCRIPTORS {
    return SYNTHESIZER_DESCRIPTORS;
  }

  readonly #core: SynthesisCore;
  readonly #ambience: Ambience;

  constructor(options: AudioWorkletNodeOptions) {
    super();
    const { seed, initialMode, initialLayers, ambience, instrument } = readSynthesizerOptions(options.processorOptions);
    this.#ambience = new Ambience(scope.sampleRate, seed, ambience);
    this.#core = new SynthesisCore(scope.sampleRate, seed, initialMode, instrument);
    this.#core.setInitialLayers(initialLayers);
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][], params: BlockParams): boolean {
    const ambience = outputs[SYNTHESIZER_OUTPUT.ambience];
    const ambienceLeft = ambience?.[0];
    if (ambienceLeft !== undefined) {
      this.#ambience.process(ambienceLeft, ambience?.[1] ?? ambienceLeft);
    }
    const output = outputs[SYNTHESIZER_OUTPUT.music];
    const left = output?.[0];
    if (output === undefined || left === undefined) {
      return true;
    }
    this.#core.process(
      left,
      // A mono output receives a single channel: the core accepts the same buffer twice.
      output[1] ?? left,
      paramValue(params, 'tempo', SYNTHESIZER_DEFAULTS.tempo),
      paramValue(params, 'mode', SYNTHESIZER_DEFAULTS.mode),
      paramValue(params, 'layers', SYNTHESIZER_DEFAULTS.layers),
    );
    for (let c = 2; c < output.length; c++) {
      output[c]?.set(left);
    }
    return true;
  }
}

scope.registerProcessor(SYNTHESIZER_NAME, SynthesizerProcessor);
