import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { csvFileName, sessionToCsv } from './exportCsv';

describe('sessionToCsv', () => {
  it('writes the session details and one row per sample', () => {
    const csv = sessionToCsv(sessionRecord({
      ratingAfter: null,
      samples: [
        sample(5, { meanHr: 62.12345, rmssd: 45.6, sdnn: 40, lfHfRatio: null, estimatedState: null }),
        sample(10, { estimatedState: 'low', goodQuality: false }),
      ],
    }));
    const lines = csv.trimEnd().split('\n');

    expect(lines).toContain('# valoracion_antes: 4');
    expect(lines).toContain('# valoracion_despues: ');
    expect(lines.slice(-3)).toEqual([
      'segundo,fc_media_lpm,rmssd_ms,sdnn_ms,lf_hf,estado_estimado,calidad_buena',
      '5,62.123,45.6,40,,,1',
      '10,70,30,35,1,"baja",0',
    ]);
  });

  it('names the file after the start instant without colons', () => {
    expect(csvFileName(sessionRecord())).toBe('neuromelody-sesion-2026-10-07T10-00-00.csv');
  });
});
