import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
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
import { SessionRecorder } from '../records/SessionRecorder';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { PageHeading } from '../../shared/PageHeading';
import { SessionStage } from './SessionStage';
import { SessionProgress } from './SessionProgress';
import { SessionCheckIn } from './SessionCheckIn';

/** Sessions shorter than this, with no indices at all, are not worth keeping. */
const MIN_KEPT_SECONDS = 60;

function worthKeeping(record: SessionRecord): boolean {
  return record.samples.length > 0 || record.listenedSeconds >= MIN_KEPT_SECONDS;
}

/**
 * Listening session at /session (docs/pantallas.md). The simple view comes
 * first: what is happening, the music controls and the session progress.
 * Signal figures and musical parameters stay one click away (ADR-24).
 * Every session that plays music is recorded on the device (RF-14).
 */
export function SessionPage(): React.JSX.Element {
  usePageTitle('Sesión');
  const [params] = useSearchParams();
  const durationMin = readDuration(params.get('duration'));
  const store = useSessionStore();
  // Acquisition creates the shared source; signal analysis consumes it.
  const [source, setSource] = useState<SignalSource | null>(null);
  const [adaptation] = useState(() => new AdaptationSession());
  const [recorder] = useState(() => new SessionRecorder());
  const [elapsedS, setElapsedS] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ratingBefore, setRatingBefore] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
        setSaveError(error instanceof Error ? error.message : 'Error desconocido.');
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
      setSaveError(null);
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
      <PageHeading eyebrow="Tu espacio de escucha" title="Sesión">
        <p>Plan: {durationMin} minutos.</p>
      </PageHeading>

      <div className="listening-stage">
        <div className="stage-main">
          <SessionStage session={adaptation} connection={connection} playing={playing} />
          <SessionCheckIn
            playing={playing}
            ratingBefore={ratingBefore}
            onRatingBeforeChange={handleRatingBefore}
            savedId={savedId}
            saveError={saveError}
          />
        </div>
        <PlaybackPanel durationMin={durationMin} onEngineChange={handleEngineChange} onElapsedChange={handleElapsedChange} />
        <SessionProgress elapsedS={elapsedS} plannedS={durationMin * 60} />
      </div>

      <AcquisitionPanel source={source} onSourceChange={handleSourceChange} />

      <details className="technical-details">
        <summary>
          <span className="summary-title">Detalles técnicos</span>
          <span className="summary-hint">Gráfica de la señal, índices y parámetros musicales</span>
        </summary>
        <div className="technical-layout">
          <SignalPanel source={source} onIndices={handleIndices} onReset={adaptation.reset} onUnavailable={adaptation.invalidate} onPulse={adaptation.pulse} />
          <MusicalStatePanel session={adaptation} />
        </div>
      </details>
    </div>
  );
}
