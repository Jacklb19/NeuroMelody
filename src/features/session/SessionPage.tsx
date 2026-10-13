import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { QUERY_PARAMS } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import type { SignalSource } from '../acquisition/contract';
import { AcquisitionPanel } from '../acquisition/AcquisitionPanel';
import { isTrialSource } from '../acquisition/sourceTraits';
import { useSignalSource } from '../acquisition/useSignalSource';
import type { AudioEngine } from '../audio/engine/AudioEngine';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { readDuration } from '../plan/plan';
import { readGoals, type GoalId } from '../plan/goalCatalog';
import { programFor } from '../plan/programCatalog';
import { readAmbience } from '../plan/ambiencePreference';
import { GoalIcon } from '../plan/GoalIcon';
import { SignalPanel } from '../signal/SignalPanel';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { loadLatestActivationModel } from '../adaptation/classifier/activationModel';
import { useCloudSync } from '../cloud/cloudSyncContext';
import { MusicalStatePanel } from '../adaptation/MusicalStatePanel';
import { worthKeeping } from '../records/retentionPolicy';
import { SessionRecorder } from '../records/SessionRecorder';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';
import type { OrbHandle } from '../../shared/BreathingOrb';
import { PageHeading } from '../../shared/PageHeading';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { SessionStage } from './SessionStage';
import { SessionProgress } from './SessionProgress';
import { SessionCheckIn } from './SessionCheckIn';
import { SessionOrb } from './SessionOrb';
import { SleepDimmer } from './SleepDimmer';
import { BreathingGuide } from './breathing/BreathingGuide';
import './session.css';

/**
 * Listening session at /session (docs/pantallas.md). The simple view comes
 * first: what is happening, the music controls and the session progress.
 * Signal figures and musical parameters stay one click away (ADR-24).
 * Every session that plays music with the person's own pulse is recorded
 * on the device (RF-14); one made with a trial source is not, and says so.
 */
export function SessionPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.session.title);
  const [params] = useSearchParams();
  const durationMin = readDuration(params.get(QUERY_PARAMS.duration));
  const goalsParam = params.get(QUERY_PARAMS.goals);
  // Parsed once per URL value, so the handlers that depend on it stay stable.
  const goals = useMemo(() => readGoals(goalsParam), [goalsParam]);
  // What the person is after decides where the music starts and how calm it gets (ADR-38).
  const program = useMemo(() => programFor(goals), [goals]);
  // Read once: the ambience of a session does not change under the person's ears.
  const [ambience] = useState(() => readAmbience(params.get(QUERY_PARAMS.ambience)));
  const store = useSessionStore();
  const { api } = useCloudSync();
  // Acquisition creates the shared source; signal analysis consumes it.
  const [source, setSource] = useState<SignalSource | null>(null);
  const [adaptation] = useState(() => new AdaptationSession(program));
  const [recorder] = useState(() => new SessionRecorder());
  const [elapsedS, setElapsedS] = useState(0);
  // The engine while the music plays; the breathing guide follows its tempo.
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const playing = engine !== null;
  const [ratingBefore, setRatingBefore] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  // The session that just ended was a trial of the app, so nothing was kept.
  const [trialEnded, setTrialEnded] = useState(false);
  // The cause is kept as is and translated when shown.
  const [saveFailure, setSaveFailure] = useState<{ readonly cause: unknown } | null>(null);
  const connection = useSignalSource(source).state;

  // Refs let the handlers below stay stable: SignalPanel restarts its Worker
  // whenever a callback it receives changes identity.
  const elapsedRef = useRef(0);
  const sessionStartElapsedRef = useRef(0);
  const ratingBeforeRef = useRef<number | null>(null);
  const sourceRef = useRef<SignalSource | null>(null);
  const orbRef = useRef<OrbHandle | null>(null);
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;

  const finishRecording = useCallback((): void => {
    const record = recorder.finish(elapsedRef.current - sessionStartElapsedRef.current);
    if (record === null) return;
    if (isTrialSource(record.sourceKind)) {
      setTrialEnded(true);
      return;
    }
    if (!worthKeeping(record)) return;
    store.save(record).then(
      () => { setSavedId(record.id); },
      (error: unknown) => {
        setSaveFailure({ cause: error });
      },
    );
  }, [recorder, store]);

  const handleEngineChange = useCallback((next: AudioEngine | null): void => {
    adaptation.setAudio(next);
    setEngine(next);
    if (next === null) {
      finishRecording();
      return;
    }
    if (!recorder.active) {
      sessionStartElapsedRef.current = elapsedRef.current;
      recorder.start({
        plannedMinutes: durationMin,
        goals,
        sourceKind: sourceRef.current?.kind ?? null,
        ratingBefore: ratingBeforeRef.current,
      });
      setSavedId(null);
      setTrialEnded(false);
      setSaveFailure(null);
    }
  }, [adaptation, recorder, durationMin, goals, finishRecording]);

  const handleElapsedChange = useCallback((seconds: number): void => {
    elapsedRef.current = seconds;
    setElapsedS(seconds);
  }, []);

  const handleIndices = useCallback((result: IndicesResult): void => {
    adaptation.receive(result);
    recorder.add(result, adaptation.getSnapshot().state);
  }, [adaptation, recorder]);

  // Each beat keeps the adaptation alive and makes the orb swell; stable, so the Worker is not restarted.
  const handlePulse = useCallback((): void => {
    adaptation.pulse();
    orbRef.current?.beat();
  }, [adaptation]);

  const handleSourceChange = useCallback((next: SignalSource): void => {
    sourceRef.current = next;
    recorder.setSource(next.kind);
    setSource(next);
  }, [recorder]);

  const handleRatingBefore = useCallback((rating: number | null): void => {
    ratingBeforeRef.current = rating;
    setRatingBefore(rating);
  }, []);

  // The trained classifier arrives a moment after the screen; until then, and if it fails, the rules estimate.
  // With an account it is the latest published version; otherwise, or without a network, the one kept or shipped.
  useEffect(() => {
    let cancelled = false;
    void loadLatestActivationModel(api === null ? {} : { published: () => api.currentClassifier() }).then((model) => {
      if (!cancelled && model !== null) adaptation.setModel(model);
    });
    return () => { cancelled = true; };
  }, [adaptation, api]);

  // Leaving the page mid-session still keeps what was listened to.
  useEffect(() => finishRecording, [finishRecording]);

  return (
    <div className="session-page">
      <SleepDimmer active={program.quietEnding && playing} />
      <PageHeading eyebrow={t.session.eyebrow} title={t.session.title}>
        <p>{t.session.plan(durationMin)}</p>
        {goals.length > 0 && (
          <ul className="session-goals" aria-label={t.records.goalsLabel}>
            {goals.map((goal) => <li key={goal}><GoalIcon goal={goal} /> {goalNames[goal]}</li>)}
          </ul>
        )}
      </PageHeading>

      <div className="listening-stage">
        <div className="orb-column">
          <SessionOrb
            session={adaptation}
            connection={connection}
            progress={elapsedS / (durationMin * SECONDS_PER_MINUTE)}
            orbRef={orbRef}
          />
          <BreathingGuide startActive={program.breathing} engine={engine} orbRef={orbRef} />
        </div>
        <div className="stage-main">
          <SessionStage session={adaptation} connection={connection} playing={playing} />
          <SessionCheckIn
            playing={playing}
            ratingBefore={ratingBefore}
            onRatingBeforeChange={handleRatingBefore}
            savedId={savedId}
            trialEnded={trialEnded}
            saveError={saveFailure === null ? null : storeErrorMessage(saveFailure.cause, t)}
          />
        </div>
        <PlaybackPanel durationMin={durationMin} initialLevel={program.startLevel} ambience={ambience} quietEnding={program.quietEnding} onEngineChange={handleEngineChange} onElapsedChange={handleElapsedChange} />
        <SessionProgress elapsedS={elapsedS} plannedS={durationMin * SECONDS_PER_MINUTE} />
      </div>

      <AcquisitionPanel source={source} onSourceChange={handleSourceChange} />

      <details className="technical-details">
        <summary>
          <span className="summary-title">{t.session.technicalDetails.title}</span>
          <span className="summary-hint">{t.session.technicalDetails.hint}</span>
        </summary>
        <div className="technical-layout">
          <SignalPanel source={source} onIndices={handleIndices} onReset={adaptation.reset} onUnavailable={adaptation.invalidate} onPulse={handlePulse} />
          <MusicalStatePanel session={adaptation} />
        </div>
      </details>
    </div>
  );
}
