import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { QUERY_PARAMS } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import type { SignalSource } from '../acquisition/contract';
import { AcquisitionPanel } from '../acquisition/AcquisitionPanel';
import { useSignalSource } from '../acquisition/useSignalSource';
import type { AudioEngine } from '../audio/engine/AudioEngine';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { readDuration } from '../plan/plan';
import { SignalPanel } from '../signal/SignalPanel';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { MusicalStatePanel } from '../adaptation/MusicalStatePanel';
import { worthKeeping } from '../records/retentionPolicy';
import { SessionRecorder } from '../records/SessionRecorder';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';
import { PageHeading } from '../../shared/PageHeading';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { SessionStage } from './SessionStage';
import { SessionProgress } from './SessionProgress';
import { SessionCheckIn } from './SessionCheckIn';

/**
 * Listening session at /session (docs/pantallas.md). The simple view comes
 * first: what is happening, the music controls and the session progress.
 * Signal figures and musical parameters stay one click away (ADR-24).
 * Every session that plays music is recorded on the device (RF-14).
 */
export function SessionPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.session.title);
  const [params] = useSearchParams();
  const durationMin = readDuration(params.get(QUERY_PARAMS.duration));
  const store = useSessionStore();
  // Acquisition creates the shared source; signal analysis consumes it.
  const [source, setSource] = useState<SignalSource | null>(null);
  const [adaptation] = useState(() => new AdaptationSession());
  const [recorder] = useState(() => new SessionRecorder());
  const [elapsedS, setElapsedS] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ratingBefore, setRatingBefore] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  // The cause is kept as is and translated when shown.
  const [saveFailure, setSaveFailure] = useState<{ readonly cause: unknown } | null>(null);
  const connection = useSignalSource(source).state;

  // Refs let the handlers below stay stable: SignalPanel restarts its Worker
  // whenever a callback it receives changes identity.
  const elapsedRef = useRef(0);
  const sessionStartElapsedRef = useRef(0);
  const ratingBeforeRef = useRef<number | null>(null);
  const sourceRef = useRef<SignalSource | null>(null);

  const finishRecording = useCallback((): void => {
    const record = recorder.finish(elapsedRef.current - sessionStartElapsedRef.current);
    if (record === null || !worthKeeping(record)) return;
    store.save(record).then(
      () => { setSavedId(record.id); },
      (error: unknown) => {
        setSaveFailure({ cause: error });
      },
    );
  }, [recorder, store]);

  const handleEngineChange = useCallback((engine: AudioEngine | null): void => {
    adaptation.setAudio(engine);
    setPlaying(engine !== null);
    if (engine === null) {
      finishRecording();
      return;
    }
    if (!recorder.active) {
      sessionStartElapsedRef.current = elapsedRef.current;
      recorder.start({
        plannedMinutes: durationMin,
        sourceKind: sourceRef.current?.kind ?? null,
        ratingBefore: ratingBeforeRef.current,
      });
      setSavedId(null);
      setSaveFailure(null);
    }
  }, [adaptation, recorder, durationMin, finishRecording]);

  const handleElapsedChange = useCallback((seconds: number): void => {
    elapsedRef.current = seconds;
    setElapsedS(seconds);
  }, []);

  const handleIndices = useCallback((result: IndicesResult): void => {
    adaptation.receive(result);
    recorder.add(result, adaptation.getSnapshot().state);
  }, [adaptation, recorder]);

  const handleSourceChange = useCallback((next: SignalSource): void => {
    sourceRef.current = next;
    recorder.setSource(next.kind);
    setSource(next);
  }, [recorder]);

  const handleRatingBefore = useCallback((rating: number | null): void => {
    ratingBeforeRef.current = rating;
    setRatingBefore(rating);
  }, []);

  // Leaving the page mid-session still keeps what was listened to.
  useEffect(() => finishRecording, [finishRecording]);

  return (
    <div className="session-page">
      <PageHeading eyebrow={t.session.eyebrow} title={t.session.title}>
        <p>{t.session.plan(durationMin)}</p>
      </PageHeading>

      <div className="listening-stage">
        <div className="stage-main">
          <SessionStage session={adaptation} connection={connection} playing={playing} />
          <SessionCheckIn
            playing={playing}
            ratingBefore={ratingBefore}
            onRatingBeforeChange={handleRatingBefore}
            savedId={savedId}
            saveError={saveFailure === null ? null : storeErrorMessage(saveFailure.cause, t)}
          />
        </div>
        <PlaybackPanel durationMin={durationMin} onEngineChange={handleEngineChange} onElapsedChange={handleElapsedChange} />
        <SessionProgress elapsedS={elapsedS} plannedS={durationMin * SECONDS_PER_MINUTE} />
      </div>

      <AcquisitionPanel source={source} onSourceChange={handleSourceChange} />

      <details className="technical-details">
        <summary>
          <span className="summary-title">{t.session.technicalDetails.title}</span>
          <span className="summary-hint">{t.session.technicalDetails.hint}</span>
        </summary>
        <div className="technical-layout">
          <SignalPanel source={source} onIndices={handleIndices} onReset={adaptation.reset} onUnavailable={adaptation.invalidate} onPulse={adaptation.pulse} />
          <MusicalStatePanel session={adaptation} />
        </div>
      </details>
    </div>
  );
}
