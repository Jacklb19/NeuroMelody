import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { APP_NAME } from '../../../config/app';
import { useMessages, type Messages } from '../../../i18n/messages';
import { SECONDS_PER_MINUTE } from '../../../shared/time';
import type { AudioFactory, AudioEngine } from '../engine/AudioEngine';
import {
  MAX_VOLUME_DB,
  MIN_VOLUME_DB,
  DEFAULT_VOLUME_DB,
  OUTPUT_THROUGH_AUDIO_ELEMENT,
  VOLUME_STEP_DB,
} from '../engine/AudioEngine';
import type { AudioEngineErrorCode, AudioEngineErrorParams } from '../engine/AudioEngineError';
import { CALIBRATION_LEVEL } from '../engine/levels';
import {
  CLOCK_CHECK_INTERVAL_MS,
  CONTINUOUS_WARNING_PERIOD_S,
  RESPONSE_WAIT_S,
  fadeStartS,
  warningInstantS,
} from '../session/durationWarnings';
import { STOP_SHORTCUT_KEY } from './stopShortcut';
import { useAudioEngine, type AudioStartFailure, type AudioState } from './useAudioEngine';

interface PlaybackPanelProps {
  readonly durationMin: number;
  /** Injectable to test without a browser. */
  readonly factory?: AudioFactory;
  readonly generateSeed?: () => number;
  readonly onEngineChange?: (engine: AudioEngine | null) => void;
  /** Listening time since the first start, read from the audio clock once per second. */
  readonly onElapsedChange?: (seconds: number) => void;
}

/** Seeds are drawn from [0, 2^31): non-negative integers that fit the 32-bit seed of the PRNG (mulberry32). */
const SEED_RANGE = 2 ** 31;

const randomSeed = (): number => Math.floor(Math.random() * SEED_RANGE);

function isDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
}

/** Text that explains a failed start: the engine's own errors are translated by code. */
function describeFailure(failure: AudioStartFailure, t: Messages): string {
  if (failure.kind === 'browser') {
    return failure.detail;
  }
  const messages: Readonly<Record<AudioEngineErrorCode, (params: AudioEngineErrorParams) => string>> =
    t.audio.errors;
  return messages[failure.error.code](failure.error.params);
}

/**
 * Session playback (RF-11, RF-18, HU-03, HU-06).
 *
 * - Stop: an always visible fixed button, the Escape key (when no dialog is
 *   open) and Media Session. Silence within 50 ms.
 * - Volume from −40 to 0 dB, −12 dB by default, with a fixed notice.
 * - Warning when the plan ends and every 60 continuous minutes. The 20 s fade
 *   that follows two minutes without an answer is scheduled on the audio
 *   clock at start: it happens even when the tab is in the background.
 */
export function PlaybackPanel({
  durationMin,
  factory,
  generateSeed = randomSeed,
  onEngineChange,
  onElapsedChange,
}: PlaybackPanelProps): React.JSX.Element {
  const t = useMessages();
  const control = useAudioEngine(factory);
  const { state, stop, engine: getEngine } = control;
  const [volumeDb, setVolumeDb] = useState(DEFAULT_VOLUME_DB);
  // Index of the open warning (0 = end of plan); `null` when there is none.
  const [warning, setWarning] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  const warningIndexRef = useRef(0);
  const fadeEndRef = useRef<number | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const volumeId = useId();
  const warningTitleId = useId();
  const warningTextId = useId();
  const planDurationS = durationMin * SECONDS_PER_MINUTE;

  const scheduleFade = useCallback(
    (engine: AudioEngine): void => {
      const startTime = sessionStartRef.current;
      if (startTime === null) {
        return;
      }
      const startsAt = startTime + fadeStartS(planDurationS, warningIndexRef.current);
      fadeEndRef.current = engine.scheduleFinalFade(startsAt - engine.audioTime);
    },
    [planDurationS],
  );

  const start = async (): Promise<void> => {
    const engine = await control.start(
      {
        seed: generateSeed(),
        initialLevel: CALIBRATION_LEVEL,
        outputThroughAudioElement: OUTPUT_THROUGH_AUDIO_ELEMENT,
      },
      volumeDb,
    );
    if (engine === null) {
      return;
    }
    sessionStartRef.current ??= engine.audioTime;
    setFinished(false);
    scheduleFade(engine);
    onEngineChange?.(engine);
  };

  const stopNow = useCallback((): void => {
    setWarning(null);
    onEngineChange?.(null);
    void stop();
  }, [stop, onEngineChange]);

  const continueSession = (): void => {
    const engine = getEngine();
    if (engine === null) {
      return;
    }
    engine.cancelFinalFade();
    warningIndexRef.current++;
    scheduleFade(engine);
    setWarning(null);
  };

  const finishSession = (): void => {
    setFinished(true);
    stopNow();
  };

  // Checks the audio clock to show the warning and to close the session once
  // the fade has ended. The sound does not depend on this timer.
  useEffect(() => {
    if (state !== 'playing') {
      return undefined;
    }
    const id = setInterval(() => {
      const engine = getEngine();
      const startTime = sessionStartRef.current;
      if (engine === null || startTime === null) {
        return;
      }
      onElapsedChange?.(engine.audioTime - startTime);
      if (engine.audioTime - startTime >= warningInstantS(planDurationS, warningIndexRef.current)) {
        setWarning(warningIndexRef.current);
      }
      const end = fadeEndRef.current;
      if (end !== null && engine.audioTime >= end) {
        setFinished(true);
        stopNow();
      }
    }, CLOCK_CHECK_INTERVAL_MS);
    return () => {
      clearInterval(id);
    };
  }, [state, getEngine, planDurationS, stopNow, onElapsedChange]);

  // Escape key: stops the music unless a dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === STOP_SHORTCUT_KEY && !isDialogOpen()) {
        stopNow();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [stopNow]);

  const mediaArtist = t.audio.playback.mediaArtist;
  // Media Session: operating system and headset controls.
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return undefined;
    }
    const session = navigator.mediaSession;
    if (typeof MediaMetadata !== 'undefined') {
      session.metadata = new MediaMetadata({ title: APP_NAME, artist: mediaArtist });
    }
    session.setActionHandler('pause', stopNow);
    session.setActionHandler('stop', stopNow);
    return () => {
      session.setActionHandler('pause', null);
      session.setActionHandler('stop', null);
    };
  }, [stopNow, mediaArtist]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state === 'playing' ? 'playing' : 'paused';
    }
  }, [state]);

  useEffect(() => {
    if (warning !== null) {
      continueButtonRef.current?.focus();
    }
  }, [warning]);

  const stateLabels: Readonly<Record<AudioState, string>> = t.audio.playback.states;
  const stateText = finished && state !== 'playing' ? t.audio.playback.finished : stateLabels[state];
  const volumeText = t.common.withUnit(String(volumeDb), t.common.units.decibels);

  return (
    <section
      aria-labelledby={titleId}
      className="playback-panel"
    >
      <h2 id={titleId}>
        {t.audio.playback.title}
      </h2>
      <p className="panel-footnote">{t.audio.playback.volumeNotice}</p>

      <div className="playback-controls">
        <button
          type="button"
          className="button button-primary play-button"
          disabled={state === 'playing' || state === 'loading'}
          onClick={() => {
            void start();
          }}
        >
          <span aria-hidden="true" className="play-symbol">▷</span> {t.audio.playback.start}
        </button>
        <label htmlFor={volumeId}>{t.audio.playback.volume}</label>
        <input
          id={volumeId}
          type="range"
          min={MIN_VOLUME_DB}
          max={MAX_VOLUME_DB}
          step={VOLUME_STEP_DB}
          value={volumeDb}
          aria-valuetext={volumeText}
          onChange={(event) => {
            const applied = getEngine()?.setVolumeDb(Number(event.target.value)) ?? Number(event.target.value);
            setVolumeDb(applied);
          }}
        />
        {/* Visual only: the control already announces the value with aria-valuetext. */}
        <span aria-hidden="true">
          {volumeText}
        </span>
      </div>

      <p role="status" className="playback-status" data-state={state}>
        {t.audio.playback.statusLabel} <strong>{stateText}</strong>
      </p>
      {control.error !== null && (
        <p className="quiet-notice">
          {t.audio.playback.unavailable(describeFailure(control.error, t))}
        </p>
      )}

      {warning !== null && (
        <dialog
          open
          role="alertdialog"
          aria-labelledby={warningTitleId}
          aria-describedby={warningTextId}
          className="duration-dialog"
        >
          <h3 id={warningTitleId}>
            {warning === 0
              ? t.audio.playback.planEndedTitle
              : t.audio.playback.continuousListeningTitle(CONTINUOUS_WARNING_PERIOD_S / SECONDS_PER_MINUTE)}
          </h3>
          <p id={warningTextId}>
            {t.audio.playback.fadeNotice(RESPONSE_WAIT_S / SECONDS_PER_MINUTE)}
          </p>
          <div className="action-row">
            <button ref={continueButtonRef} type="button" className="button button-primary" onClick={continueSession}>
              {t.audio.playback.continue}
            </button>
            <button type="button" className="button button-secondary" onClick={finishSession}>
              {t.audio.playback.finish}
            </button>
          </div>
        </dialog>
      )}

      <button
        type="button"
        onClick={stopNow}
        disabled={state !== 'playing'}
        aria-keyshortcuts={STOP_SHORTCUT_KEY}
        className="button stop-button"
      >
        <span aria-hidden="true" className="stop-symbol" /> {t.audio.playback.stop}
      </button>
    </section>
  );
}
