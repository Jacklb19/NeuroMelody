import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AudioFactory, AudioEngine } from '../engine/AudioEngine';
import { MAX_VOLUME_DB, MIN_VOLUME_DB, DEFAULT_VOLUME_DB } from '../engine/AudioEngine';
import { CALIBRATION_LEVEL } from '../engine/levels';
import { fadeStartS, warningInstantS } from '../session/durationWarnings';
import { useAudioEngine, type AudioState } from './useAudioEngine';

interface PlaybackPanelProps {
  readonly durationMin: number;
  /** Inyectables para probar sin navegador. */
  readonly factory?: AudioFactory;
  readonly generateSeed?: () => number;
}

const STATE_TEXT: Readonly<Record<AudioState, string>> = {
  idle: 'Lista para empezar',
  loading: 'Preparando el audio…',
  playing: 'Sonando',
  stopped: 'Detenida',
  error: 'No se pudo iniciar el audio',
};

const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

const buttonStyle: React.CSSProperties = {
  padding: 'var(--espacio-2) var(--espacio-4)',
  backgroundColor: 'var(--color-boton-fondo)',
  color: 'var(--color-boton-texto)',
  border: 'none',
  borderRadius: 'var(--radio-borde)',
  fontSize: 'var(--texto-base)',
  cursor: 'pointer',
};

function isDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
}

/**
 * Reproducción de la sesión (RF-11, RF-18, HU-03, HU-06).
 *
 * - Detener: botón fijo siempre visible, tecla Esc (si no hay un diálogo
 *   abierto) y Media Session. Silencio en 50 ms.
 * - Volumen de −40 a 0 dB, −12 dB por omisión, con aviso fijo.
 * - Aviso al terminar el plan y cada 60 minutos continuos. El fundido de
 *   20 s que sigue si no hay respuesta en 2 minutos se agenda en el reloj de
 *   audio al iniciar: ocurre aunque la pestaña esté en segundo plano.
 */
export function PlaybackPanel({
  durationMin,
  factory,
  generateSeed = randomSeed,
}: PlaybackPanelProps): React.JSX.Element {
  const control = useAudioEngine(factory);
  const { state, stop, engine: getEngine } = control;
  const [volumeDb, setVolumeDb] = useState(DEFAULT_VOLUME_DB);
  // Índice del aviso abierto (0 = fin del plan); `null` si no hay aviso.
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
  };

  const stopNow = useCallback((): void => {
    setWarning(null);
    void stop();
  }, [stop]);

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

  // Revisa el reloj de audio para mostrar el aviso y para cerrar la sesión si
  // el fundido terminó. El sonido no depende de este temporizador.
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

  // Tecla Esc: detiene la música, salvo que haya un diálogo abierto.
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

  // Media Session: controles del sistema operativo y del auricular.
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
      style={{
        border: 'var(--borde-grosor) solid var(--color-borde)',
        borderRadius: 'var(--radio-borde)',
        padding: 'var(--espacio-6)',
        marginBottom: 'var(--espacio-8)',
      }}
    >
      <h2 id={titleId} style={{ fontSize: 'var(--texto-xl)', marginBottom: 'var(--espacio-4)' }}>
        Música
      </h2>
      <p style={{ marginBottom: 'var(--espacio-4)' }}>Usa un volumen moderado en tu dispositivo.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--espacio-4)', alignItems: 'center', marginBottom: 'var(--espacio-4)' }}>
        <button
          type="button"
          style={buttonStyle}
          disabled={state === 'playing' || state === 'loading'}
          onClick={() => {
            void start();
          }}
        >
          Iniciar música
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
        {/* Solo visual: el control ya anuncia el valor con aria-valuetext. */}
        <span aria-hidden="true" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {volumeDb} dB
        </span>
      </div>

      <p role="status">
        Estado de la música: <strong>{stateText}</strong>
      </p>
      {control.error !== null && (
        <p style={{ marginTop: 'var(--espacio-2)' }}>
          El audio no está disponible en este navegador ({control.error}).
        </p>
      )}

      {warning !== null && (
        <dialog
          open
          role="alertdialog"
          aria-labelledby={warningTitleId}
          aria-describedby={warningTextId}
          style={{
            position: 'static',
            marginTop: 'var(--espacio-4)',
            padding: 'var(--espacio-4)',
            border: 'var(--borde-grosor) solid var(--color-borde)',
            borderRadius: 'var(--radio-borde)',
          }}
        >
          <h3 id={warningTitleId} style={{ fontSize: 'var(--texto-lg)', marginBottom: 'var(--espacio-2)' }}>
            {warning === 0 ? 'La sesión planificada terminó' : 'Llevas 60 minutos de escucha continua'}
          </h3>
          <p id={warningTextId} style={{ marginBottom: 'var(--espacio-4)' }}>
            Si no respondes, la música se apagará en 2 minutos con un fundido suave.
          </p>
          <div style={{ display: 'flex', gap: 'var(--espacio-4)' }}>
            <button ref={continueButtonRef} type="button" style={buttonStyle} onClick={continueSession}>
              Continuar
            </button>
            <button type="button" style={buttonStyle} onClick={finishSession}>
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
        style={{
          ...buttonStyle,
          position: 'fixed',
          right: 'var(--espacio-4)',
          bottom: 'var(--espacio-4)',
          zIndex: 10,
          padding: 'var(--espacio-3) var(--espacio-6)',
          opacity: state === 'playing' ? 1 : 0.6,
        }}
      >
        Detener
      </button>
    </section>
  );
}
