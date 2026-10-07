import { useId, useSyncExternalStore } from 'react';
import { useMessages } from '../../i18n/messages';
import type { ConnectionState } from '../acquisition/contract';
import type { AdaptationSession } from '../adaptation/AdaptationSession';
import { MIN_LEVEL_DURATION_S } from '../adaptation/rules';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { describeListening, type ListeningNarrativeId } from './listeningNarrative';

interface NarrativeText {
  readonly title: string;
  readonly detail: string;
}

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
  const t = useMessages();
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const titleId = useId();
  // Typed by id, so a situation without words is a compile error.
  const narratives: Readonly<Record<ListeningNarrativeId, NarrativeText>> = t.session.narrative;
  const narrative = narratives[describeListening({
    connection,
    state: snapshot.state,
    qualityGood: snapshot.qualityGood,
    musicPlaying: playing,
  })];
  const connected = connection === 'connected';

  return (
    <section aria-labelledby={titleId} className="session-stage">
      <p className="eyebrow">{t.session.stage.eyebrow}</p>
      <h2 id={titleId} className="stage-title">{narrative.title}</h2>
      <p className="stage-detail">{narrative.detail}</p>

      <div className="estimated-state">
        <p role="status">
          {t.session.stage.estimatedState}{' '}
          <strong data-testid="activation-state">
            {snapshot.state === null ? t.adaptation.states.calibrating : t.adaptation.states[snapshot.state]}
          </strong>
        </p>
        <p className="confidence-note">{t.session.stage.confidence}</p>
      </div>

      {connected && playing && !snapshot.qualityGood && (
        <p className="quiet-notice">{t.session.stage.waitingForQuality}</p>
      )}
      {snapshot.waitingForDwell && (
        <p className="quiet-notice" data-testid="dwell-notice">
          {t.session.stage.dwell(MIN_LEVEL_DURATION_S / SECONDS_PER_MINUTE)}
        </p>
      )}
    </section>
  );
}
