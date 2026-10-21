import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { QUERY_PARAMS } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import type { SignalSource } from '../acquisition/contract';
import { AcquisitionPanel } from '../acquisition/AcquisitionPanel';
import { isTrialSource } from '../acquisition/sourceTraits';
import { useSignalSource } from '../acquisition/useSignalSource';
import type { AudioEngine } from '../audio/engine/AudioEngine';
import { PlaybackPanel, type PlaybackHandle } from '../audio/ui/PlaybackPanel';
import { readDuration, QUICK_DURATION_MIN } from '../plan/plan';
import { readGoals, type GoalId } from '../plan/goalCatalog';
import { programFor } from '../plan/programCatalog';
import { readAmbience, readInstrument, rememberAmbience, rememberInstrument, rememberGoals } from '../plan/soundChoices';
import { GoalIcon } from '../plan/GoalIcon';
import { SignalPanel } from '../signal/SignalPanel';
import type { IndicesResult } from '../signal/processing/SignalProcessor';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { loadLatestActivationModel } from '../adaptation/classifier/activationModel';
import { useCloudSync } from '../cloud/cloudSyncContext';
import { MusicalStatePanel } from '../adaptation/MusicalStatePanel';
import { worthKeeping } from '../records/retentionPolicy';
import { SessionRecorder } from '../records/SessionRecorder';
import { createSessionContext } from '../records/sessionContext';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';
import type { OrbHandle } from '../../shared/BreathingOrb';
import { PageHeading } from '../../shared/PageHeading';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { SessionStage } from './SessionStage';
import { SessionProgress } from './SessionProgress';
import { SessionCheckIn } from './SessionCheckIn';
import { SessionOrb } from './SessionOrb';
import { SessionRecap } from './SessionRecap';
import { ArrivalSlide } from './ArrivalSlide';
import { SessionStepper } from './SessionStepper';
import { AUTO_ADVANCE_MS, SLIDE_IDS, useSlides, type SlideId } from './sessionSlides';
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
  const [instrument] = useState(() => readInstrument(params.get(QUERY_PARAMS.instrument)));
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
  // Before the first note the screen is a short path of steps; afterwards it is the listening space.
  const [everPlayed, setEverPlayed] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  // The session that just ended was a trial of the app, so nothing was kept.
  const [trialEnded, setTrialEnded] = useState(false);
  // The cause is kept as is and translated when shown.
  const [saveFailure, setSaveFailure] = useState<{ readonly cause: unknown } | null>(null);
  const reading = useSignalSource(source);
  const connection = reading.state;
  const { slide, goTo } = useSlides('pulse');
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const pulseTitleId = useId();
  const arrivalTitleId = useId();
  const listeningTitleId = useId();
  const slideIds = useMemo(
    () => ({ pulse: pulseTitleId, arrival: arrivalTitleId, listening: listeningTitleId }),
    [pulseTitleId, arrivalTitleId, listeningTitleId],
  );

  // Refs let the handlers below stay stable: SignalPanel restarts its Worker
  // whenever a callback it receives changes identity.
  const elapsedRef = useRef(0);
  const sessionStartElapsedRef = useRef(0);
  const ratingBeforeRef = useRef<number | null>(null);
  const sourceRef = useRef<SignalSource | null>(null);
  const orbRef = useRef<OrbHandle | null>(null);
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;

  const finishRecording = useCallback((): void => {
    // The adaptation has just been handed the end of the music, so its story is complete.
    const record = recorder.finish(elapsedRef.current - sessionStartElapsedRef.current, adaptation.getSnapshot().recap);
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
  }, [adaptation, recorder, store]);

  const handleEngineChange = useCallback((next: AudioEngine | null): void => {
    adaptation.setAudio(next);
    setEngine(next);
    if (next === null) {
      finishRecording();
      return;
    }
    setEverPlayed(true);
    // However the music started, the listening slide is where it is followed.
    goTo('listening');
    if (!recorder.active) {
      rememberGoals(goals);
      rememberInstrument(instrument);
      rememberAmbience(ambience);
      sessionStartElapsedRef.current = elapsedRef.current;
      recorder.start({
        plannedMinutes: durationMin,
        goals,
        sourceKind: sourceRef.current?.kind ?? null,
        ratingBefore: ratingBeforeRef.current,
        context: createSessionContext(instrument, ambience),
      });
      setSavedId(null);
      setTrialEnded(false);
      setSaveFailure(null);
    }
  }, [adaptation, recorder, durationMin, goals, instrument, ambience, finishRecording, goTo]);

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

  // The first time the pulse connects, the next slide comes in on its own, after a moment to read it.
  const connectedOnce = useRef(false);
  useEffect(() => {
    if (connection !== 'connected' || connectedOnce.current) return undefined;
    connectedOnce.current = true;
    if (slide !== 'pulse') return undefined;
    const timer = setTimeout(() => { goTo('arrival'); }, AUTO_ADVANCE_MS);
    return () => { clearTimeout(timer); };
  }, [connection, slide, goTo]);

  // After a slide change the focus goes to its title, so the keyboard and screen readers follow.
  const firstSlide = useRef(true);
  useEffect(() => {
    if (firstSlide.current) {
      firstSlide.current = false;
      return;
    }
    document.getElementById(slideIds[slide])?.focus();
  }, [slide, slideIds]);

  const done = new Set<SlideId>();
  if (connection === 'connected') done.add('pulse');
  if (everPlayed) done.add('arrival');
  const reachable = new Set<SlideId>(SLIDE_IDS.filter((id) => id !== 'listening' || everPlayed || playing || slide === 'listening'));
  const slideNames: Readonly<Record<SlideId, string>> = t.session.slides.names;

  return (
    <div className="session-page">
      <SleepDimmer active={program.quietEnding && playing} />
      <PageHeading eyebrow={t.session.eyebrow} title={t.session.title}>
        <p>{t.session.plan(durationMin)}</p>
        {durationMin === QUICK_DURATION_MIN && <p>{t.insights.quick.calibration}</p>}
        {goals.length > 0 && (
          <ul className="session-goals" aria-label={t.records.goalsLabel}>
            {goals.map((goal) => <li key={goal}><GoalIcon goal={goal} /> {goalNames[goal]}</li>)}
          </ul>
        )}
      </PageHeading>

      <SessionStepper current={slide} done={done} reachable={reachable} onSelect={goTo} />

      {/* Every slide stays mounted while away: the source keeps measuring and the music keeps playing,
          and the Stop button and the plan warnings stay in sight on every slide (session.css). */}
      <div className="session-slides">
        <section className={slide === 'pulse' ? 'session-slide' : 'session-slide is-away'} aria-labelledby={slideIds.pulse}>
          <h2 id={slideIds.pulse} className="slide-title" tabIndex={-1}>{slideNames.pulse}</h2>
          <p className="slide-lead">{t.session.slides.leads.pulse}</p>
          <AcquisitionPanel source={source} onSourceChange={handleSourceChange} />
          <div className="slide-actions">
            <button type="button" className="pill-button pill-button-ghost" onClick={() => { goTo('arrival'); }}>
              {connection === 'connected' ? t.session.slides.next : t.session.slides.withoutPulse}
            </button>
          </div>
        </section>

        <section className={slide === 'arrival' ? 'session-slide' : 'session-slide is-away'} aria-labelledby={slideIds.arrival}>
          <h2 id={slideIds.arrival} className="slide-title" tabIndex={-1}>{slideNames.arrival}</h2>
          <p className="slide-lead">{t.session.slides.leads.arrival}</p>
          <ArrivalSlide
            reading={reading}
            goals={goals}
            instrument={instrument}
            ambience={ambience}
            rating={ratingBefore}
            onRatingChange={handleRatingBefore}
            onMeasure={() => { goTo('pulse'); }}
            onStart={() => {
              // Started inside the click, as browsers require. The listening slide comes in at once,
              // so a start the browser refuses is explained where the controls are.
              goTo('listening');
              playbackRef.current?.start();
            }}
          />
        </section>

        <section className={slide === 'listening' ? 'session-slide' : 'session-slide is-away'} aria-labelledby={slideIds.listening}>
          <h2 id={slideIds.listening} className="visually-hidden" tabIndex={-1}>{slideNames.listening}</h2>
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
          <SessionStage session={adaptation} connection={connection} playing={playing} ended={everPlayed && !playing} />
          <SessionCheckIn
            playing={playing}
            ratingBefore={ratingBefore}
            onRatingBeforeChange={handleRatingBefore}
            savedId={savedId}
            trialEnded={trialEnded}
            saveError={saveFailure === null ? null : storeErrorMessage(saveFailure.cause, t)}
            askRating={false}
          />
          <SessionRecap session={adaptation} playing={playing} />
        </div>
        <PlaybackPanel ref={playbackRef} durationMin={durationMin} initialLevel={program.startLevel} ambience={ambience} instrument={instrument} quietEnding={program.quietEnding} onEngineChange={handleEngineChange} onElapsedChange={handleElapsedChange} />
        <SessionProgress elapsedS={elapsedS} plannedS={durationMin * SECONDS_PER_MINUTE} />
      </div>
        </section>
      </div>

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
