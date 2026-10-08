import { useId, useSyncExternalStore } from 'react';
import type { ConnectionState } from '../acquisition/contract';
import type { AdaptationSession } from '../adaptation/AdaptationSession';
import { describeListening } from './listeningNarrative';

const STATE_TEXT = { high: 'Alta', low: 'Baja', uncertain: 'Incierta' } as const;

interface SessionStageProps {
  readonly session: AdaptationSession;
  readonly connection: ConnectionState;
  readonly playing: boolean;
}

/**
 * Simple view of the session (ADR-24): the moment in plain words, the
 * estimated state with its uncalibrated confidence, and the notices that
 * explain why the music holds still. Technical figures live elsewhere.
 */
export function SessionStage({ session, connection, playing }: SessionStageProps): React.JSX.Element {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const titleId = useId();
  const narrative = describeListening({
    connection,
    state: snapshot.state,
    qualityGood: snapshot.qualityGood,
    musicPlaying: playing,
  });
  const connected = connection === 'connected';

  return (
    <section aria-labelledby={titleId} className="session-stage">
      <p className="eyebrow">Ahora</p>
      <h2 id={titleId} className="stage-title">{narrative.title}</h2>
      <p className="stage-detail">{narrative.detail}</p>

      <div className="estimated-state">
        <p role="status">
          Estado estimado:{' '}
          <strong data-testid="activation-state">
            {snapshot.state === null ? 'Calibrando: no hay datos suficientes' : STATE_TEXT[snapshot.state]}
          </strong>
        </p>
        <p className="confidence-note">Confianza no calibrada · reglas provisionales</p>
      </div>

      {connected && playing && !snapshot.qualityGood && (
        <p className="quiet-notice">La adaptación espera datos de buena calidad.</p>
      )}
      {snapshot.waitingForDwell && (
        <p className="quiet-notice" data-testid="dwell-notice">
          Se conserva el escalón hasta completar su duración mínima de 3 minutos.
        </p>
      )}
    </section>
  );
}
