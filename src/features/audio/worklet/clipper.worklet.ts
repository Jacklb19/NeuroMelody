/**
 * Last link of the chain: soft clipping with a −1 dBFS ceiling (RF-18).
 * The native compressor does not guarantee the maximum; this clipper does.
 * It publishes each block peak to the telemetry ring buffer.
 */
import { softClipBlock } from '../core/softClip';
import { TelemetryWriter } from '../telemetry/telemetryRing';
import { scope } from './workletScope';
import { CLIPPER_NAME, readClipperOptions } from './workletContract';

class ClipperProcessor extends scope.AudioWorkletProcessor {
  readonly #telemetry: TelemetryWriter | null;

  constructor(options: AudioWorkletNodeOptions) {
    super();
    const { telemetry } = readClipperOptions(options.processorOptions);
    this.#telemetry = telemetry === null ? null : new TelemetryWriter(telemetry);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const output = outputs[0];
    let peak = 0;
    if (output !== undefined) {
      for (let c = 0; c < output.length; c++) {
        const outputChannel = output[c];
        const inputChannel = input?.[c];
        if (outputChannel === undefined) {
          continue;
        }
        if (inputChannel === undefined) {
          outputChannel.fill(0);
          continue;
        }
        outputChannel.set(inputChannel);
        peak = Math.max(peak, softClipBlock(outputChannel));
      }
    }
    this.#telemetry?.write(peak);
    return true;
  }
}

scope.registerProcessor(CLIPPER_NAME, ClipperProcessor);
