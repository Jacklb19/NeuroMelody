import { useId, useSyncExternalStore } from 'react';
import { LEVELS } from '../audio/engine/levels';
import type { AdaptationSession } from './AdaptationSession';

const STATE_TEXT = { high: 'Alta', low: 'Baja', uncertain: 'Incierta' } as const;
const MODE_TEXT = ['Pentatónica mayor', 'Lidio', 'Bordón con pentatónica'] as const;

/** Descriptive state and scheduled music, in the /session panel approved by the map. */
export function MusicalStatePanel({ session }: { readonly session: AdaptationSession }): React.JSX.Element {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const title = useId();
  const level = LEVELS[state.level];
  return <section aria-labelledby={title} style={{
    border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--border-radius)',
    padding: 'var(--space-6)', marginBottom: 'var(--space-8)',
  }}>
    <h2 id={title} style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Estado musical</h2>
    <p role="status">Estado estimado: <strong data-testid="activation-state">{
      state.state === null ? 'Calibrando: no hay datos suficientes' : STATE_TEXT[state.state]
    }</strong></p>
    <p>Confianza no calibrada · reglas provisionales</p>
    {!state.qualityGood && <p>La adaptación espera datos de buena calidad.</p>}
    {state.waitingForDwell && <p data-testid="dwell-notice">Se conserva el escalón hasta completar su duración mínima de 3 minutos.</p>}
    <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--space-1) var(--space-4)', marginTop: 'var(--space-4)' }}>
      <dt>Escalón musical</dt><dd data-testid="music-level">{level.name}</dd>
      <dt>Tempo actual</dt><dd>{state.tempoBpm === null ? '—' : `${String(Math.round(state.tempoBpm))} BPM`}</dd>
      <dt>Tempo de destino</dt><dd>{level.tempo} BPM</dd>
      <dt>Modo programado</dt><dd>{MODE_TEXT[level.mode]}</dd>
      <dt>Capas programadas</dt><dd>{level.layers}</dd>
    </dl>
    <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)' }}>
      Los cambios son graduales. El modo cambia al cerrar el ciclo musical.
    </p>
  </section>;
}
