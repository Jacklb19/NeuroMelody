import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { CHART_PALETTE_ERROR_CODES } from './drawing/palette';
import { QUALITY_ICONS } from './presentation';
import { SIGNAL_QUALITIES } from './processing/types';
import { SIGNAL_THREAD_ERROR_CODES } from './thread/protocol';

describe('signal dictionary', () => {
  it.each([...SIGNAL_THREAD_ERROR_CODES])('words the thread error %s', (code) => {
    expect(es.signal.errors[code].trim()).not.toBe('');
  });

  it.each([...CHART_PALETTE_ERROR_CODES])('words the palette error %s with its detail', (code) => {
    expect(es.signal.chart.paletteErrors[code]('--detail')).toContain('--detail');
  });

  it.each([...SIGNAL_QUALITIES])('labels the %s quality and gives it a glyph', (quality) => {
    expect(es.signal.quality[quality].trim()).not.toBe('');
    expect(QUALITY_ICONS[quality].trim()).not.toBe('');
  });
});
