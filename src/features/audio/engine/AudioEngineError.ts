/** Reasons the audio engine can fail on its own; the interface translates each one. */
export const AUDIO_ENGINE_ERROR_CODES = ['missing_parameter'] as const;

export type AudioEngineErrorCode = (typeof AUDIO_ENGINE_ERROR_CODES)[number];

/** Details the translated message may mention. */
export interface AudioEngineErrorParams {
  /** Synthesizer parameter involved. */
  readonly parameter: string;
}

/**
 * Failure of the audio engine itself. `message` is English text for
 * developers; the person reads the dictionary entry of `code`.
 */
export class AudioEngineError extends Error {
  readonly code: AudioEngineErrorCode;
  readonly params: AudioEngineErrorParams;

  constructor(code: AudioEngineErrorCode, params: AudioEngineErrorParams, message: string) {
    super(message);
    this.name = 'AudioEngineError';
    this.code = code;
    this.params = params;
  }
}
