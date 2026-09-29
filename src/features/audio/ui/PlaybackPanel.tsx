import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FabricaAudio, MotorAudio } from '../engine/AudioEngine';
import { VOLUMEN_MAXIMO_DB, VOLUMEN_MINIMO_DB, VOLUMEN_POR_OMISION_DB } from '../engine/AudioEngine';
import { NIVEL_CALIBRACION } from '../engine/levels';
import { inicioFundidoS, instanteAvisoS } from '../session/durationWarnings';
import { useMotorAudio, type EstadoAudio } from './useAudioEngine';

interface PropsPanelReproduccion {
  readonly duracionMin: number;
  /** Inyectables para probar sin navegador. */
  readonly fabrica?: FabricaAudio;
  readonly generarSemilla?: () => number;
}

const TEXTO_ESTADO: Readonly<Record<EstadoAudio, string>> = {
  inactivo: 'Lista para empezar',
  cargando: 'Preparando el audio…',
  sonando: 'Sonando',
  detenido: 'Detenida',
  error: 'No se pudo iniciar el audio',
};

const semillaAleatoria = (): number => Math.floor(Math.random() * 2 ** 31);

const estiloBoton: React.CSSProperties = {
  padding: 'var(--espacio-2) var(--espacio-4)',
  backgroundColor: 'var(--color-boton-fondo)',
  color: 'var(--color-boton-texto)',
  border: 'none',
  borderRadius: 'var(--radio-borde)',
  fontSize: 'var(--texto-base)',
  cursor: 'pointer',
};

function hayDialogoAbierto(): boolean {
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
export function PanelReproduccion({
  duracionMin,
  fabrica,
  generarSemilla = semillaAleatoria,
}: PropsPanelReproduccion): React.JSX.Element {
  const control = useMotorAudio(fabrica);
  const { estado, detener, motor: obtenerMotor } = control;
  const [volumenDb, setVolumenDb] = useState(VOLUMEN_POR_OMISION_DB);
  // Índice del aviso abierto (0 = fin del plan); `null` si no hay aviso.
  const [aviso, setAviso] = useState<number | null>(null);
  const [terminada, setTerminada] = useState(false);
  const inicioSesionRef = useRef<number | null>(null);
  const indiceAvisoRef = useRef(0);
  const finFundidoRef = useRef<number | null>(null);
  const botonContinuarRef = useRef<HTMLButtonElement | null>(null);
  const tituloId = useId();
  const volumenId = useId();
  const avisoTituloId = useId();
  const avisoTextoId = useId();
  const duracionPlanS = duracionMin * 60;

  const programarFundido = useCallback(
    (motor: MotorAudio): void => {
      const inicio = inicioSesionRef.current;
      if (inicio === null) {
        return;
      }
      const empieza = inicio + inicioFundidoS(duracionPlanS, indiceAvisoRef.current);
      finFundidoRef.current = motor.programarFundidoFinal(empieza - motor.tiempoAudio);
    },
    [duracionPlanS],
  );

  const iniciar = async (): Promise<void> => {
    const motor = await control.iniciar(
      { semilla: generarSemilla(), nivelInicial: NIVEL_CALIBRACION, salidaPorElementoAudio: false },
      volumenDb,
    );
    if (motor === null) {
      return;
    }
    inicioSesionRef.current ??= motor.tiempoAudio;
    setTerminada(false);
    programarFundido(motor);
  };

  const detenerAhora = useCallback((): void => {
    setAviso(null);
    void detener();
  }, [detener]);

  const continuar = (): void => {
    const motor = obtenerMotor();
    if (motor === null) {
      return;
    }
    motor.cancelarFundidoFinal();
    indiceAvisoRef.current++;
    programarFundido(motor);
    setAviso(null);
  };

  const terminar = (): void => {
    setTerminada(true);
    detenerAhora();
  };

  // Revisa el reloj de audio para mostrar el aviso y para cerrar la sesión si
  // el fundido terminó. El sonido no depende de este temporizador.
  useEffect(() => {
    if (estado !== 'sonando') {
      return undefined;
    }
    const id = setInterval(() => {
      const motor = obtenerMotor();
      const inicio = inicioSesionRef.current;
      if (motor === null || inicio === null) {
        return;
      }
      if (motor.tiempoAudio - inicio >= instanteAvisoS(duracionPlanS, indiceAvisoRef.current)) {
        setAviso(indiceAvisoRef.current);
      }
      const fin = finFundidoRef.current;
      if (fin !== null && motor.tiempoAudio >= fin) {
        setTerminada(true);
        detenerAhora();
      }
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [estado, obtenerMotor, duracionPlanS, detenerAhora]);

  // Tecla Esc: detiene la música, salvo que haya un diálogo abierto.
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape' && !hayDialogoAbierto()) {
        detenerAhora();
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
    };
  }, [detenerAhora]);

  // Media Session: controles del sistema operativo y del auricular.
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return undefined;
    }
    const sesion = navigator.mediaSession;
    if (typeof MediaMetadata !== 'undefined') {
      sesion.metadata = new MediaMetadata({ title: 'NeuroMelody', artist: 'Sesión de escucha' });
    }
    sesion.setActionHandler('pause', detenerAhora);
    sesion.setActionHandler('stop', detenerAhora);
    return () => {
      sesion.setActionHandler('pause', null);
      sesion.setActionHandler('stop', null);
    };
  }, [detenerAhora]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = estado === 'sonando' ? 'playing' : 'paused';
    }
  }, [estado]);

  useEffect(() => {
    if (aviso !== null) {
      botonContinuarRef.current?.focus();
    }
  }, [aviso]);

  const textoEstado = terminada && estado !== 'sonando' ? 'La sesión terminó' : TEXTO_ESTADO[estado];

  return (
    <section
      aria-labelledby={tituloId}
      style={{
        border: 'var(--borde-grosor) solid var(--color-borde)',
        borderRadius: 'var(--radio-borde)',
        padding: 'var(--espacio-6)',
        marginBottom: 'var(--espacio-8)',
      }}
    >
      <h2 id={tituloId} style={{ fontSize: 'var(--texto-xl)', marginBottom: 'var(--espacio-4)' }}>
        Música
      </h2>
      <p style={{ marginBottom: 'var(--espacio-4)' }}>Usa un volumen moderado en tu dispositivo.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--espacio-4)', alignItems: 'center', marginBottom: 'var(--espacio-4)' }}>
        <button
          type="button"
          style={estiloBoton}
          disabled={estado === 'sonando' || estado === 'cargando'}
          onClick={() => {
            void iniciar();
          }}
        >
          Iniciar música
        </button>
        <label htmlFor={volumenId}>Volumen</label>
        <input
          id={volumenId}
          type="range"
          min={VOLUMEN_MINIMO_DB}
          max={VOLUMEN_MAXIMO_DB}
          step={1}
          value={volumenDb}
          aria-valuetext={`${String(volumenDb)} dB`}
          onChange={(evento) => {
            const aplicado = obtenerMotor()?.fijarVolumenDb(Number(evento.target.value)) ?? Number(evento.target.value);
            setVolumenDb(aplicado);
          }}
        />
        {/* Solo visual: el control ya anuncia el valor con aria-valuetext. */}
        <span aria-hidden="true" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {volumenDb} dB
        </span>
      </div>

      <p role="status">
        Estado de la música: <strong>{textoEstado}</strong>
      </p>
      {control.error !== null && (
        <p style={{ marginTop: 'var(--espacio-2)' }}>
          El audio no está disponible en este navegador ({control.error}).
        </p>
      )}

      {aviso !== null && (
        <dialog
          open
          role="alertdialog"
          aria-labelledby={avisoTituloId}
          aria-describedby={avisoTextoId}
          style={{
            position: 'static',
            marginTop: 'var(--espacio-4)',
            padding: 'var(--espacio-4)',
            border: 'var(--borde-grosor) solid var(--color-borde)',
            borderRadius: 'var(--radio-borde)',
          }}
        >
          <h3 id={avisoTituloId} style={{ fontSize: 'var(--texto-lg)', marginBottom: 'var(--espacio-2)' }}>
            {aviso === 0 ? 'La sesión planificada terminó' : 'Llevas 60 minutos de escucha continua'}
          </h3>
          <p id={avisoTextoId} style={{ marginBottom: 'var(--espacio-4)' }}>
            Si no respondes, la música se apagará en 2 minutos con un fundido suave.
          </p>
          <div style={{ display: 'flex', gap: 'var(--espacio-4)' }}>
            <button ref={botonContinuarRef} type="button" style={estiloBoton} onClick={continuar}>
              Continuar
            </button>
            <button type="button" style={estiloBoton} onClick={terminar}>
              Terminar
            </button>
          </div>
        </dialog>
      )}

      <button
        type="button"
        onClick={detenerAhora}
        disabled={estado !== 'sonando'}
        aria-keyshortcuts="Escape"
        style={{
          ...estiloBoton,
          position: 'fixed',
          right: 'var(--espacio-4)',
          bottom: 'var(--espacio-4)',
          zIndex: 10,
          padding: 'var(--espacio-3) var(--espacio-6)',
          opacity: estado === 'sonando' ? 1 : 0.6,
        }}
      >
        Detener
      </button>
    </section>
  );
}
