import { describe, expect, it } from 'vitest';
import { es } from '../../../i18n/es';
import { AUDIO_ENGINE_ERROR_CODES, AudioEngineError } from './AudioEngineError';

describe('AudioEngineError', () => {
  it.each(AUDIO_ENGINE_ERROR_CODES)('%s has a non-empty Spanish message', (code) => {
    expect(es.audio.errors[code]({ parameter: 'tempo' }).trim()).not.toBe('');
  });

  it('keeps an English developer message apart from its code and params', () => {
    const error = new AudioEngineError('missing_parameter', { parameter: 'tempo' }, 'Missing tempo.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AudioEngineError');
    expect(error.message).toBe('Missing tempo.');
    expect(error.code).toBe('missing_parameter');
    expect(error.params).toEqual({ parameter: 'tempo' });
  });
});
