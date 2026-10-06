import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AudioFactory, AudioEngine } from '../engine/AudioEngine';
import { MAX_VOLUME_DB, MIN_VOLUME_DB, DEFAULT_VOLUME_DB } from '../engine/AudioEngine';
import { CALIBRATION_LEVEL } from '../engine/levels';
import { fadeStartS, warningInstantS } from '../session/durationWarnings';
import { useAudioEngine, type AudioState } from './useAudioEngine';

interface PlaybackPanelProps {
  readonly durationMin: number;
  /** Injectable to test without a browser. */
  readonly factory?: AudioFactory;
  readonly generateSeed?: () => number;
  readonly onEngineChange?: (engine: AudioEngine | null) => void;
}

const STATE_TEXT: Readonly<Record<AudioState, string>> = {
  idle: 'Lista para empezar',
  loading: 'Preparando el audio…',
  playing: 'Sonando',
  stopped: 'Detenida',
  error: 'No se pudo iniciar el audio',
};

const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

function isDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
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
}: PlaybackPanelProps): React.JSX.Element {
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
  const planDurationS = durationMin * 60;

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
      { seed: generateSeed(), initialLevel: CALIBRATION_LEVEL, outputThroughAudioElement: false },
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
      if (engine.audioTime - startTime >= warningInstantS(planDurationS, warningIndexRef.current)) {
        setWarning(warningIndexRef.current);
      }
      const end = fadeEndRef.current;
      if (end !== null && engine.audioTime >= end) {
        setFinished(true);
        stopNow();
      }
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [state, getEngine, planDurationS, stopNow]);

  // Escape key: stops the music unless a dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isDialogOpen()) {
        stopNow();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [stopNow]);

  // Media Session: operating system and headset controls.
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return undefined;
    }
    const session = navigator.mediaSession;
    if (typeof MediaMetadata !== 'undefined') {
      session.metadata = new MediaMetadata({ title: 'NeuroMelody', artist: 'Sesión de escucha' });
    }
    session.setActionHandler('pause', stopNow);
    session.setActionHandler('stop', stopNow);
    return () => {
      session.setActionHandler('pause', null);
      session.setActionHandler('stop', null);
    };
  }, [stopNow]);

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

  const stateText = finished && state !== 'playing' ? 'La sesión terminó' : STATE_TEXT[state];

  return (
    <section
      aria-labelledby={titleId}
      className="playback-panel"
    >
      <h2 id={titleId}>
        Música
      </h2>
      <p className="panel-footnote">Usa un volumen moderado en tu dispositivo.</p>

      <div className="playback-controls">
        <button
          type="button"
          className="button button-primary play-button"
          disabled={state === 'playing' || state === 'loading'}
          onClick={() => {
            void start();
          }}
        >
          <span aria-hidden="true" className="play-symbol">▷</span> Iniciar música
        </button>
        <label htmlFor={volumeId}>Volumen</label>
        <input
          id={volumeId}
          type="range"
          min={MIN_VOLUME_DB}
          max={MAX_VOLUME_DB}
          step={1}
          value={volumeDb}
          aria-valuetext={`${String(volumeDb)} dB`}
          onChange={(event) => {
            const applied = getEngine()?.setVolumeDb(Number(event.target.value)) ?? Number(event.target.value);
            setVolumeDb(applied);
          }}
        />
        {/* Visual only: the control already announces the value with aria-valuetext. */}
        <span aria-hidden="true">
          {volumeDb} dB
        </span>
      </div>

      <p role="status" className="playback-status" data-state={state}>
        Estado de la música: <strong>{stateText}</strong>
      </p>
      {control.error !== null && (
        <p className="quiet-notice">
          El audio no está disponible en este navegador ({control.error}).
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
            {warning === 0 ? 'La sesión planificada terminó' : 'Llevas 60 minutos de escucha continua'}
          </h3>
          <p id={warningTextId}>
            Si no respondes, la música se apagará en 2 minutos con un fundido suave.
          </p>
          <div className="action-row">
            <button ref={continueButtonRef} type="button" className="button button-primary" onClick={continueSession}>
              Continuar
            </button>
            <button type="button" className="button button-secondary" onClick={finishSession}>
              Terminar
            </button>
          </div>
        </dialog>
      )}

      <button
        type="button"
        onClick={stopNow}
        disabled={state !== 'playing'}
        aria-keyshortcuts="Escape"
        className="button stop-button"
      >
        <span aria-hidden="true" className="stop-symbol" /> Detener
      </button>
    </section>
  );
}
