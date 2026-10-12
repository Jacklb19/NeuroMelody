import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { DOWNLOAD_FILE_PREFIX } from '../../config/app';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { BreathingOrb, type OrbHandle } from '../../shared/BreathingOrb';
import { ConfirmButton } from '../../shared/ConfirmButton';
import { downloadText } from '../../shared/downloadText';
import { formatClock } from '../../shared/formatClock';
import { PageHeading } from '../../shared/PageHeading';
import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '../../shared/time';
import { AcquisitionPanel, type AcquisitionPanelProps } from '../acquisition/AcquisitionPanel';
import type { SignalSource } from '../acquisition/contract';
import { useSignalSource } from '../acquisition/useSignalSource';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { uuidv7 } from '../records/uuidv7';
import { useBreathingGuide } from '../session/breathing/useBreathingGuide';
import {
  COLLECTION_STAGE_IDS,
  nextSubtractionValue,
  PROTOCOL_SECONDS,
  STAGE_SECONDS,
  SUBTRACTION_START,
  SUBTRACTION_STEP,
  type CollectionStageId,
} from './collectionProtocol';
import {
  beatCount,
  buildCollectionExport,
  isMeasuringSource,
  type CollectionRecording,
  type CollectionSegment,
} from './collectionRecording';
import { useCollectionStore } from './collectionStore';
import { participantCode, participantStorage } from './participant';
import { StageRecorder } from './StageRecorder';
import './collection.css';

/** Where the person is in the guided recording. */
type Step =
  | { readonly kind: 'intro' }
  /** The instructions of a stage, before the person starts it. */
  | { readonly kind: 'ready'; readonly stage: number; readonly repeated: boolean }
  | { readonly kind: 'recording'; readonly stage: number; readonly elapsedMs: number }
  | { readonly kind: 'saved' }
  /** The protocol was walked with a trial source: nothing was kept. */
  | { readonly kind: 'trial_done' }
  | { readonly kind: 'save_failed' };

const EXPORT_MIME_TYPE = 'application/json';

/** The stage whose activity has a field to type in. */
const TASK_STAGE: CollectionStageId = 'demanding_task';

const minutesOf = (seconds: number): number => Math.round(seconds / SECONDS_PER_MINUTE);

interface CollectionPageProps {
  /** Lets tests inject sources on a fake clock and a Bluetooth adapter. */
  readonly acquisition?: Pick<AcquisitionPanelProps, 'createSource' | 'createBle' | 'bluetooth' | 'startInTrial'>;
}

/**
 * Guided recording that gives the classifier examples of this person
 * (ADR-33): rest, slow breathing and a demanding task, each stored with its
 * label. It asks for explicit consent, keeps everything on the device and
 * lets the person export or delete it. The model is never trained here.
 */
export function CollectionPage({ acquisition }: CollectionPageProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.collection;
  usePageTitle(copy.pageTitle);
  const store = useCollectionStore();
  const [source, setSource] = useState<SignalSource | null>(null);
  const connection = useSignalSource(source).state;
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'intro' });
  const [recordings, setRecordings] = useState<readonly CollectionRecording[] | null>(null);
  const consentId = useId();

  // Read by the source subscription, which must not be rebuilt on every notification.
  const recorderRef = useRef<StageRecorder | null>(null);
  const stageRef = useRef(0);
  const segmentsRef = useRef<CollectionSegment[]>([]);
  const startedRef = useRef<{ readonly recordedAt: string; readonly consentAt: string } | null>(null);
  const sourceRef = useRef<SignalSource | null>(null);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  // Each step replaces the button that led to it; the focus follows to the new step instead of
  // falling back to the top of the page. The counting task takes it itself, for its answer box.
  const stepRef = useRef<HTMLElement | null>(null);
  const stepKey = step.kind === 'ready' || step.kind === 'recording' ? `${step.kind}-${String(step.stage)}` : step.kind;
  useEffect(() => {
    if (stepKey !== 'intro') stepRef.current?.focus();
  }, [stepKey]);

  const refresh = useCallback((): void => {
    store.list().then(setRecordings, () => { setRecordings([]); });
  }, [store]);
  useEffect(refresh, [refresh]);

  const finish = useCallback((): void => {
    const started = startedRef.current;
    const kind = sourceRef.current?.kind;
    if (started === null || kind === undefined) return;
    if (!isMeasuringSource(kind)) {
      // A trial of the protocol: those beats are nobody's, so there is nothing to keep.
      setStep({ kind: 'trial_done' });
      return;
    }
    const recording: CollectionRecording = {
      id: uuidv7(),
      participant: participantCode(participantStorage()),
      recordedAt: started.recordedAt,
      consentAt: started.consentAt,
      sourceKind: kind,
      segments: segmentsRef.current,
    };
    store.save(recording).then(
      () => {
        setStep({ kind: 'saved' });
        refresh();
      },
      () => { setStep({ kind: 'save_failed' }); },
    );
  }, [store, refresh]);

  useEffect(() => {
    if (source === null) return undefined;
    return source.subscribe({
      onNotification: (notification) => {
        const recorder = recorderRef.current;
        if (recorder === null) return;
        const status = recorder.add(notification);
        const stage = stageRef.current;
        if (status === 'interrupted') {
          recorderRef.current = null;
          setStep({ kind: 'ready', stage, repeated: true });
          return;
        }
        if (status === 'recording') {
          setStep({ kind: 'recording', stage, elapsedMs: recorder.elapsedMs });
          return;
        }
        recorderRef.current = null;
        segmentsRef.current = [...segmentsRef.current, recorder.segment()];
        if (stage + 1 < COLLECTION_STAGE_IDS.length) setStep({ kind: 'ready', stage: stage + 1, repeated: false });
        else finish();
      },
    });
  }, [source, finish]);

  const begin = (): void => {
    const now = new Date().toISOString();
    startedRef.current = { recordedAt: now, consentAt: now };
    segmentsRef.current = [];
    setStep({ kind: 'ready', stage: 0, repeated: false });
  };

  const startStage = (stage: number): void => {
    const id = COLLECTION_STAGE_IDS[stage];
    if (id === undefined) return;
    stageRef.current = stage;
    recorderRef.current = new StageRecorder(id, STAGE_SECONDS[id]);
    setStep({ kind: 'recording', stage, elapsedMs: 0 });
  };

  const cancel = (): void => {
    recorderRef.current = null;
    segmentsRef.current = [];
    startedRef.current = null;
    setStep({ kind: 'intro' });
  };

  const exportAll = (): void => {
    if (recordings === null || recordings.length === 0) return;
    const now = new Date();
    downloadText(
      copy.saved.fileName(DOWNLOAD_FILE_PREFIX, now.toISOString().slice(0, 10)),
      JSON.stringify(buildCollectionExport(recordings, now)),
      EXPORT_MIME_TYPE,
    );
  };

  const remove = (id: string): void => {
    store.delete(id).then(refresh, refresh);
  };

  const connected = connection === 'connected';
  const measuring = source !== null && isMeasuringSource(source.kind);
  const inProtocol = step.kind === 'ready' || step.kind === 'recording';

  return (
    <div className="collection-page">
      <PageHeading eyebrow={copy.eyebrow} title={copy.pageTitle}>
        <p>{copy.introduction(minutesOf(PROTOCOL_SECONDS))}</p>
      </PageHeading>

      {step.kind === 'intro' && (
        <section className="glass-card collection-card" aria-labelledby={`${consentId}-steps`}>
          <h2 id={`${consentId}-steps`}>{copy.steps.title}</h2>
          <ol className="collection-steps">
            {COLLECTION_STAGE_IDS.map((id) => (
              <li key={id}>
                <strong>{copy.stages[id].name}</strong>
                <span className="collection-duration">{copy.minutes(minutesOf(STAGE_SECONDS[id]))}</span>
                <span className="secondary-text">{copy.stages[id].summary}</span>
              </li>
            ))}
          </ol>
          <h2>{copy.consent.title}</h2>
          <ul className="collection-facts">
            {copy.consent.facts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
          <div className="confirmation-control">
            <input id={consentId} type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); }} />
            <label htmlFor={consentId}>{copy.consent.label}</label>
          </div>
          <div className="collection-actions">
            <button type="button" className="pill-button pill-button-primary pill-button-large" disabled={!consent || !connected} onClick={begin}>
              {copy.begin}
            </button>
            {!connected && <p className="secondary-text">{copy.connectFirst}</p>}
            {connected && !consent && <p className="secondary-text">{copy.consentFirst}</p>}
          </div>
          {source !== null && !measuring && <p role="status" className="quiet-notice">{copy.demoSource}</p>}
        </section>
      )}

      {step.kind === 'ready' && (
        <StageIntro ref={stepRef} stage={step.stage} repeated={step.repeated} connected={connected} onStart={() => { startStage(step.stage); }} onCancel={cancel} />
      )}
      {step.kind === 'recording' && <StageRunning ref={stepRef} stage={step.stage} elapsedMs={step.elapsedMs} onCancel={cancel} />}

      {step.kind === 'saved' && (
        <section className="glass-card collection-card" role="status" tabIndex={-1} ref={stepRef}>
          <h2>{copy.saved.title}</h2>
          <p>{copy.saved.text}</p>
          <div className="collection-actions">
            <button type="button" className="pill-button pill-button-primary" onClick={exportAll}>{copy.saved.export}</button>
            <Link to={ROUTES.app} className="pill-button pill-button-ghost">{copy.saved.home}</Link>
          </div>
        </section>
      )}
      {step.kind === 'trial_done' && (
        <section className="glass-card collection-card" role="status" tabIndex={-1} ref={stepRef}>
          <h2>{copy.trialDone.title}</h2>
          <p>{copy.trialDone.text}</p>
          <button type="button" className="pill-button pill-button-ghost" onClick={cancel}>{copy.trialDone.again}</button>
        </section>
      )}
      {step.kind === 'save_failed' && (
        <section className="glass-card collection-card" role="alert" tabIndex={-1} ref={stepRef}>
          <h2>{copy.saveFailed.title}</h2>
          <p>{copy.saveFailed.text}</p>
          <button type="button" className="pill-button pill-button-ghost" onClick={cancel}>{copy.saveFailed.retry}</button>
        </section>
      )}

      {/* Stays mounted through the whole protocol: unmounting it would disconnect the source. */}
      <div className="glass-card collection-source" data-quiet={inProtocol ? '' : undefined}>
        <AcquisitionPanel source={source} onSourceChange={setSource} {...acquisition} />
      </div>

      {recordings !== null && recordings.length > 0 && !inProtocol && (
        <SavedRecordings recordings={recordings} onExport={exportAll} onDelete={remove} />
      )}
    </div>
  );
}

interface StageIntroProps {
  readonly stage: number;
  /** The signal started over, so the stage has to be recorded again. */
  readonly repeated: boolean;
  readonly connected: boolean;
  readonly onStart: () => void;
  readonly onCancel: () => void;
  readonly ref: React.Ref<HTMLElement>;
}

function StageIntro({ stage, repeated, connected, onStart, onCancel, ref }: StageIntroProps): React.JSX.Element | null {
  const copy = useMessages().collection;
  const titleId = useId();
  const id = COLLECTION_STAGE_IDS[stage];
  if (id === undefined) return null;
  const words = copy.stages[id];
  return (
    <section className="glass-card collection-card collection-stage" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
      <p className="eyebrow">{copy.stageCount(stage + 1, COLLECTION_STAGE_IDS.length)}</p>
      <h2 id={titleId}>{words.name}</h2>
      {repeated && <p className="quiet-notice">{copy.interrupted}</p>}
      <p className="collection-instruction">{words.instruction(SUBTRACTION_START, SUBTRACTION_STEP)}</p>
      <p className="secondary-text">{copy.minutes(minutesOf(STAGE_SECONDS[id]))} · {copy.stopAnytime}</p>
      <div className="collection-actions">
        <button type="button" className="pill-button pill-button-primary pill-button-large" disabled={!connected} onClick={onStart}>
          {copy.startStage}
        </button>
        <button type="button" className="text-button" onClick={onCancel}>{copy.cancel}</button>
      </div>
      {!connected && <p className="secondary-text">{copy.connectFirst}</p>}
    </section>
  );
}

interface StageRunningProps {
  readonly stage: number;
  readonly elapsedMs: number;
  readonly onCancel: () => void;
  readonly ref: React.Ref<HTMLElement>;
}

function StageRunning({ stage, elapsedMs, onCancel, ref }: StageRunningProps): React.JSX.Element | null {
  const copy = useMessages().collection;
  const titleId = useId();
  const id = COLLECTION_STAGE_IDS[stage];
  if (id === undefined) return null;
  const plannedS = STAGE_SECONDS[id];
  const elapsedS = Math.min(plannedS, elapsedMs / MS_PER_SECOND);
  return (
    <section className="glass-card collection-card collection-stage" aria-labelledby={titleId} tabIndex={-1} ref={id === TASK_STAGE ? undefined : ref}>
      <p className="eyebrow">{copy.stageCount(stage + 1, COLLECTION_STAGE_IDS.length)}</p>
      <h2 id={titleId}>{copy.stages[id].name}</h2>
      <StageActivity id={id} />
      <div
        className="staff"
        role="progressbar"
        aria-label={copy.progressLabel}
        aria-valuemin={0}
        aria-valuemax={plannedS}
        aria-valuenow={Math.round(elapsedS)}
        aria-valuetext={copy.remaining(formatClock(plannedS - elapsedS))}
        style={{ '--progress': elapsedS / plannedS } as React.CSSProperties}
      >
        <span className="staff-ink" aria-hidden="true" />
        <span className="staff-note" aria-hidden="true" />
      </div>
      <p className="collection-clock" data-testid="collection-remaining">{copy.remaining(formatClock(plannedS - elapsedS))}</p>
      <button type="button" className="text-button" onClick={onCancel}>{copy.cancel}</button>
    </section>
  );
}

/** What the person does during each stage; keyed by the protocol so a new stage cannot ship without it. */
function StageActivity({ id }: { readonly id: CollectionStageId }): React.JSX.Element {
  const activities: Readonly<Record<CollectionStageId, React.JSX.Element>> = {
    rest: <RestActivity />,
    slow_breathing: <BreathingActivity />,
    demanding_task: <SubtractionTask />,
  };
  return activities[id];
}

function RestActivity(): React.JSX.Element {
  const copy = useMessages().collection.stages.rest;
  return (
    <div className="collection-activity">
      <BreathingOrb />
      <p className="collection-instruction">{copy.during}</p>
    </div>
  );
}

function BreathingActivity(): React.JSX.Element {
  const t = useMessages();
  const orbRef = useRef<OrbHandle | null>(null);
  // Without music the guide keeps the slow pace every session starts with, on the wall clock.
  const phase = useBreathingGuide(true, null, orbRef);
  return (
    <div className="collection-activity">
      <BreathingOrb ref={orbRef} />
      <p className="breath-word" aria-live="polite" data-testid="collection-breath">{t.session.breathing.phases[phase]}</p>
      <p className="secondary-text">{t.session.breathing.hint}</p>
    </div>
  );
}

/** Counting down in steps against the clock. Only the heartbeats are recorded, never the answers. */
function SubtractionTask(): React.JSX.Element {
  const copy = useMessages().collection.task;
  const [current, setCurrent] = useState(SUBTRACTION_START);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const inputId = useId();
  const expected = current - SUBTRACTION_STEP;

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    if (answer.trim() === '') return;
    const right = Number(answer) === expected;
    setWrong(!right);
    if (right) setCurrent(nextSubtractionValue(current));
    setAnswer('');
  };

  return (
    <form className="collection-activity collection-task" onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="collection-instruction">{copy.question(current, SUBTRACTION_STEP)}</label>
      <div className="collection-answer">
        <input
          id={inputId}
          className="collection-input"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={answer}
          onChange={(event) => { setAnswer(event.target.value); }}
        />
        <button type="submit" className="pill-button pill-button-ghost">{copy.submit}</button>
      </div>
      <p role="status" className="secondary-text">{wrong ? copy.wrong(current) : copy.hurry}</p>
    </form>
  );
}

interface SavedRecordingsProps {
  readonly recordings: readonly CollectionRecording[];
  readonly onExport: () => void;
  readonly onDelete: (id: string) => void;
}

function SavedRecordings({ recordings, onExport, onDelete }: SavedRecordingsProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.collection.list;
  const format = useRecordFormatter();
  const titleId = useId();
  return (
    <section className="collection-list" aria-labelledby={titleId}>
      <div className="collection-list-heading">
        <h2 id={titleId}>{copy.title}</h2>
        <button type="button" className="pill-button pill-button-ghost" onClick={onExport}>{copy.exportAll(recordings.length)}</button>
      </div>
      <p className="secondary-text">{copy.about}</p>
      <ul>
        {recordings.map((recording) => (
          <li key={recording.id} className="glass-card">
            <div>
              <strong>{format.sessionDate(recording.recordedAt)}</strong>
              <span className="secondary-text">{copy.detail(t.acquisition.sources[recording.sourceKind], beatCount(recording))}</span>
            </div>
            <ConfirmButton label={copy.delete} confirmLabel={copy.confirmDelete} onConfirm={() => { onDelete(recording.id); }} />
          </li>
        ))}
      </ul>
    </section>
  );
}
