import { useEffect, useId, useState } from 'react';
import type { EstadoConexion, FuenteSenal } from './contrato';
import {
  ESCENARIOS,
  IDS_ESCENARIOS,
  type IdEscenario,
} from './simulador/escenarios';
import {
  FuenteSimulada,
  VELOCIDADES,
  type OpcionesFuenteSimulada,
  type Velocidad,
} from './simulador/FuenteSimulada';
import { useFuenteSenal } from './useFuenteSenal';

/** Semilla fija: la misma sesión simulada se repite al reconectar (RF-02). */
export const SEMILLA_SIMULADOR = 1;

export type CrearFuenteSimulada = (opciones: OpcionesFuenteSimulada) => FuenteSenal;

const crearFuentePorOmision: CrearFuenteSimulada = (opciones) =>
  new FuenteSimulada(opciones);

const TEXTO_ESTADO: Readonly<Record<EstadoConexion, string>> = {
  desconectada: 'Desconectada',
  conectando: 'Conectando…',
  conectada: 'Conectada',
  reconectando: 'Reconectando…',
  error: 'Error de conexión',
};

function formatearTiempo(ms: number): string {
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, '0');
  const segundos = String(totalSegundos % 60).padStart(2, '0');
  return `${minutos}:${segundos}`;
}

function aEscenario(valor: string): IdEscenario {
  return IDS_ESCENARIOS.find((id) => id === valor) ?? 'reposo';
}

function aVelocidad(valor: string): Velocidad {
  return VELOCIDADES.find((v) => String(v) === valor) ?? 1;
}

interface PropsPanelAdquisicion {
  /** Fuente actual; la guarda el componente padre para compartirla con el análisis. */
  readonly fuente: FuenteSenal | null;
  readonly alCambiarFuente: (fuente: FuenteSenal) => void;
  /** Permite inyectar un reloj falso en las pruebas. */
  readonly crearFuente?: CrearFuenteSimulada;
}

/**
 * Panel de la capa de adquisición: elige el escenario y la velocidad del
 * simulador, conecta o desconecta, y muestra siempre el estado de la
 * conexión (HU-01) junto con la última lectura recibida.
 */
export function PanelAdquisicion({
  fuente,
  alCambiarFuente,
  crearFuente = crearFuentePorOmision,
}: PropsPanelAdquisicion): React.JSX.Element {
  const [escenario, setEscenario] = useState<IdEscenario>('reposo');
  const [velocidad, setVelocidad] = useState<Velocidad>(1);
  const lectura = useFuenteSenal(fuente);
  const tituloId = useId();

  // Detiene la fuente al reemplazarla o al desmontar el panel.
  useEffect(
    () => () => {
      void fuente?.desconectar();
    },
    [fuente],
  );

  const activa = lectura.estado !== 'desconectada' && lectura.estado !== 'error';

  const conectar = (): void => {
    const nueva = crearFuente({ escenario, velocidad, semilla: SEMILLA_SIMULADOR });
    alCambiarFuente(nueva);
    void nueva.conectar();
  };

  const desconectar = (): void => {
    void fuente?.desconectar();
  };

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
        Fuente de señal
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--espacio-4)', marginBottom: 'var(--espacio-4)' }}>
        <label style={{ display: 'grid', gap: 'var(--espacio-1)' }}>
          Escenario del simulador
          <select
            value={escenario}
            disabled={activa}
            onChange={(evento) => {
              setEscenario(aEscenario(evento.target.value));
            }}
          >
            {IDS_ESCENARIOS.map((id) => (
              <option key={id} value={id}>
                {ESCENARIOS[id].nombre}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 'var(--espacio-1)' }}>
          Velocidad
          <select
            value={velocidad}
            disabled={activa}
            onChange={(evento) => {
              setVelocidad(aVelocidad(evento.target.value));
            }}
          >
            {VELOCIDADES.map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={activa ? desconectar : conectar}
        style={{
          padding: 'var(--espacio-2) var(--espacio-4)',
          backgroundColor: 'var(--color-boton-fondo)',
          color: 'var(--color-boton-texto)',
          border: 'none',
          borderRadius: 'var(--radio-borde)',
          cursor: 'pointer',
          fontSize: 'var(--texto-base)',
          marginBottom: 'var(--espacio-4)',
        }}
      >
        {activa ? 'Desconectar' : 'Conectar simulador'}
      </button>

      <p role="status" style={{ marginBottom: 'var(--espacio-4)' }}>
        Estado de la conexión: <strong>{TEXTO_ESTADO[lectura.estado]}</strong>
      </p>

      {lectura.error !== null && (
        <p role="alert" style={{ color: 'var(--color-error-texto)', marginBottom: 'var(--espacio-4)' }}>
          La medición no es fiable y se descartó ({lectura.error}). Revisa la colocación del dispositivo.
        </p>
      )}

      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--espacio-1) var(--espacio-4)' }}>
        <dt>Frecuencia cardíaca</dt>
        <dd data-testid="frecuencia-cardiaca">
          {lectura.ultima === null ? '—' : `${String(lectura.ultima.frecuenciaCardiaca)} lpm`}
        </dd>
        <dt>Latidos recibidos</dt>
        <dd data-testid="latidos-recibidos">{lectura.latidosRecibidos}</dd>
        <dt>Tiempo de señal</dt>
        <dd data-testid="tiempo-senal">
          {lectura.ultima === null ? '—' : formatearTiempo(lectura.ultima.tiempoMs)}
        </dd>
      </dl>
    </section>
  );
}
