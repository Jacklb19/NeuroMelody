import type { SessionRecord } from './sessionRecord';

const COLUMNS = ['segundo', 'fc_media_lpm', 'rmssd_ms', 'sdnn_ms', 'lf_hf', 'estado_estimado', 'calidad_buena'] as const;

const STATE_LABEL = { high: 'alta', low: 'baja', uncertain: 'incierta' } as const;

function cell(value: number | string | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(Math.round(value * 1000) / 1000);
  // Quotes every text cell so commas or quotes inside it cannot break the row.
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * Builds the downloadable CSV of a session (RF-15): commented header lines
 * with the session details, then one row every 5 s of signal. Column names
 * are in Spanish because the file is meant for the person and their
 * therapist; numbers use a dot so spreadsheets and scripts parse them alike.
 */
export function sessionToCsv(record: SessionRecord): string {
  const header = [
    `# NeuroMelody · sesión ${record.id}`,
    `# inicio: ${record.startedAt}`,
    `# fin: ${record.endedAt}`,
    `# plan_minutos: ${String(record.plannedMinutes)}`,
    `# escucha_segundos: ${String(Math.round(record.listenedSeconds))}`,
    `# valoracion_antes: ${record.ratingBefore === null ? '' : String(record.ratingBefore)}`,
    `# valoracion_despues: ${record.ratingAfter === null ? '' : String(record.ratingAfter)}`,
    '# Indicadores descriptivos; no son una medida clínica.',
  ];
  const rows = record.samples.map((sample) => [
    cell(sample.second),
    cell(sample.meanHr),
    cell(sample.rmssd),
    cell(sample.sdnn),
    cell(sample.lfHfRatio),
    sample.estimatedState === null ? '' : cell(STATE_LABEL[sample.estimatedState]),
    sample.goodQuality ? '1' : '0',
  ].join(','));
  return [...header, COLUMNS.join(','), ...rows].join('\n') + '\n';
}

/** File name with the UTC start instant, safe on every operating system. */
export function csvFileName(record: SessionRecord): string {
  return `neuromelody-sesion-${record.startedAt.slice(0, 19).replaceAll(':', '-')}.csv`;
}
