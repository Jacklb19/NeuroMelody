import { useId, useSyncExternalStore } from 'react';
import { useMessages } from '../../i18n/messages';
import type { ConnectionState } from '../acquisition/contract';
import type { AdaptationSession } from '../adaptation/AdaptationSession';
import { MIN_LEVEL_DURATION_S } from '../adaptation/rules';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { describeListening, type ListeningNarrativeId } from './listeningNarrative';
import { SessionJourney } from './SessionJourney';

interface NarrativeText {
  readonly title: string;
  readonly detail: string;
}

interface SessionStageProps {
  readonly session: AdaptationSession;
  readonly connection: ConnectionState;
  readonly playing: boolean;
  /** The music played and has stopped: the session is over, so the moment and the estimate give way to its end. */
  readonly ended?: boolean;
}

const PERCENT = 100;

/**
 * Simple view of the session (ADR-24, ADR-42): the moment in plain words,
 * the steps the music can take with the current one marked, its pace, the
 * estimated state with what it means, and the notices that explain why the
 * music holds still. Technical figures live elsewhere.
 */
export function SessionStage({ session, connection, playing, ended = false }: SessionStageProps): React.JSX.Element {
  const t = useMessages();
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const titleId = useId();
  // Typed by id, so a situation without words is a compile error.
  const narratives: Readonly<Record<ListeningNarrativeId, NarrativeText>> = t.session.narrative;
  const moment = narratives[describeListening({
    connection,
    state: snapshot.state,
    qualityGood: snapshot.qualityGood,
    musicPlaying: playing,
  })];
  const narrative = ended ? t.session.stage.ended : moment;
  const connected = connection === 'connected';
  // Says who is estimating: the trained model (with its confidence once it has one) or the fallback rules.
  const estimateNote = snapshot.estimator === 'rules'
    ? t.session.stage.confidence
    : snapshot.confidence === null || snapshot.state === null
      ? t.session.stage.modelReady
      : t.session.stage.modelConfidence(Math.round(snapshot.confidence * PERCENT));

  return (
    <section aria-labelledby={titleId} className="session-stage">
      {!ended && <p className="eyebrow">{t.session.stage.eyebrow}</p>}
      <h2 id={titleId} className="stage-title">{narrative.title}</h2>
      <p className="stage-detail">{narrative.detail}</p>

      {playing && (
        <div className="music-now">
          <SessionJourney range={session.range} level={snapshot.level} />
          {snapshot.tempoBpm !== null && (
            <p className="music-pace">
              {t.session.stage.pace(Math.round(snapshot.tempoBpm), snapshot.tempoOffsetBpm !== 0)}
            </p>
          )}
        </div>
      )}

      {!ended && <div className="estimated-state">
        <p role="status">
          {t.session.stage.estimatedState}{' '}
          <strong data-testid="activation-state">
            {snapshot.state === null ? t.adaptation.states.calibrating : t.adaptation.states[snapshot.state]}
          </strong>
        </p>
        <p className="confidence-note" data-testid="estimate-note">{estimateNote}</p>
        <details className="state-help">
          <summary>{t.session.stage.help.summary}</summary>
          <p>{t.session.stage.help.text}</p>
        </details>
      </div>}

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
