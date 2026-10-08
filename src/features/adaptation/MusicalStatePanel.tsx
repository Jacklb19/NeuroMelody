import { useId, useSyncExternalStore } from 'react';
import { LEVELS } from '../audio/engine/levels';
import type { AdaptationSession } from './AdaptationSession';

const MODE_TEXT = ['Pentatónica mayor', 'Lidio', 'Bordón con pentatónica'] as const;

/**
 * Scheduled musical parameters (RF-09, RF-12), shown among the technical
 * details of /session. The estimated state itself lives in the simple view.
 */
export function MusicalStatePanel({ session }: { readonly session: AdaptationSession }): React.JSX.Element {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const title = useId();
  const level = LEVELS[state.level];
  return <section aria-labelledby={title} className="musical-state-panel">
    <h2 id={title}>Parámetros musicales</h2>
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
