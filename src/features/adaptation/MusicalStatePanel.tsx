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
  return <section aria-labelledby={title} className="musical-state-panel">
    <h2 id={title}>Estado musical</h2>
    <div className="estimated-state">
      <p role="status">Estado estimado: <strong data-testid="activation-state">{
        state.state === null ? 'Calibrando: no hay datos suficientes' : STATE_TEXT[state.state]
      }</strong></p>
      <p className="confidence-note">Confianza no calibrada · reglas provisionales</p>
    </div>
    {!state.qualityGood && <p className="quiet-notice">La adaptación espera datos de buena calidad.</p>}
    {state.waitingForDwell && <p className="quiet-notice" data-testid="dwell-notice">Se conserva el escalón hasta completar su duración mínima de 3 minutos.</p>}
    <dl className="music-metrics">
      <div className="music-level"><dt>Escalón musical</dt><dd data-testid="music-level">{level.name}</dd></div>
      <div className="tempo-metric"><dt>Tempo actual</dt><dd>{state.tempoBpm === null ? '—' : `${String(Math.round(state.tempoBpm))} BPM`}</dd></div>
      <div><dt>Tempo de destino</dt><dd>{level.tempo} BPM</dd></div>
      <div><dt>Modo programado</dt><dd>{MODE_TEXT[level.mode]}</dd></div>
      <div><dt>Capas programadas</dt><dd>{level.layers}</dd></div>
    </dl>
    <p className="panel-footnote">
      Los cambios son graduales. El modo cambia al cerrar el ciclo musical.
    </p>
  </section>;
}
