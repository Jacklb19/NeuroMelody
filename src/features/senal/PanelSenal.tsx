import { useEffect, useId, useRef, useState } from 'react';
import type { FuenteSenal } from '../adquisicion/contrato';
import type { DimensionesLienzo } from './dibujo/dibujarTacograma';
import { ErrorPaletaGrafica, leerPaletaGrafica, type PaletaGrafica } from './dibujo/paleta';
import { ClienteHiloSenal, crearPuertoWorker } from './hilo/ClienteHiloSenal';
import type { CalidadSenal, ResultadoIndices } from './procesamiento/ProcesadorSenal';
import { VENTANA_ANALISIS_MS } from './procesamiento/umbrales';

type TransferirLienzo = (lienzo: HTMLCanvasElement) => OffscreenCanvas;

interface PropsPanelSenal {
  readonly fuente: FuenteSenal | null;
  /** Permite usar un hilo de señal en el mismo proceso en las pruebas. */
  readonly crearCliente?: () => ClienteHiloSenal;
  readonly leerPaleta?: () => PaletaGrafica;
  /** `null` si el navegador no puede transferir un lienzo a un Worker. */
  readonly transferirLienzo?: TransferirLienzo | null;
}

type EstadoGrafica =
  | { readonly tipo: 'lista'; readonly paleta: PaletaGrafica; readonly transferir: TransferirLienzo }
  | { readonly tipo: 'no-disponible'; readonly motivo: string };

const TEXTO_CALIDAD: Readonly<Record<CalidadSenal, { icono: string; texto: string }>> = {
  reuniendo: { icono: '…', texto: 'Reuniendo datos…' },
  buena: { icono: '✓', texto: 'Buena' },
  baja: { icono: '△', texto: 'Baja: revisa la colocación del dispositivo.' },
};

const crearClientePorOmision = (): ClienteHiloSenal => new ClienteHiloSenal(crearPuertoWorker());

function transferenciaDelNavegador(): TransferirLienzo | null {
  return typeof HTMLCanvasElement !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype
    ? (lienzo) => lienzo.transferControlToOffscreen()
    : null;
}

function evaluarGrafica(
  transferir: TransferirLienzo | null,
  leerPaleta: () => PaletaGrafica,
): EstadoGrafica {
  if (transferir === null) {
    return { tipo: 'no-disponible', motivo: 'Este navegador no puede dibujar la gráfica en segundo plano.' };
  }
  try {
    return { tipo: 'lista', paleta: leerPaleta(), transferir };
  } catch (error) {
    // Solo se oculta la gráfica: los indicadores en texto siguen funcionando.
    if (error instanceof ErrorPaletaGrafica) {
      return { tipo: 'no-disponible', motivo: `Faltan estilos de la gráfica (${error.message})` };
    }
    throw error;
  }
}

function medir(contenedor: HTMLElement): DimensionesLienzo {
  const { width, height } = contenedor.getBoundingClientRect();
  return { anchoCss: width, altoCss: height, escala: window.devicePixelRatio || 1 };
}

function formatearMinutos(ms: number): string {
  const segundos = Math.floor(ms / 1000);
  return `${String(Math.floor(segundos / 60))}:${String(segundos % 60).padStart(2, '0')}`;
}

function formatear(valor: number | null, unidad: string): string {
  return valor === null ? '—' : `${String(Math.round(valor))} ${unidad}`;
}

/**
 * Señal e indicadores (RF-05, RF-12). La gráfica se dibuja en el Worker de
 * señal sobre un lienzo transferido; la información completa está además en
 * texto (RNF-09): indicadores, ventana analizada y calidad de la señal, que
 * se anuncia a los lectores de pantalla solo cuando cambia.
 */
export function PanelSenal({
  fuente,
  crearCliente,
  leerPaleta = leerPaletaGrafica,
  transferirLienzo,
}: PropsPanelSenal): React.JSX.Element {
  const [grafica] = useState<EstadoGrafica>(() =>
    evaluarGrafica(
      transferirLienzo === undefined ? transferenciaDelNavegador() : transferirLienzo,
      leerPaleta,
    ),
  );
  const [hiloDisponible] = useState(
    () => crearCliente !== undefined || typeof Worker !== 'undefined',
  );
  const [lectura, setLectura] = useState<{ fuente: FuenteSenal; resultado: ResultadoIndices } | null>(
    null,
  );
  const [errorHilo, setErrorHilo] = useState<string | null>(null);
  const clienteRef = useRef<ClienteHiloSenal | null>(null);
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const tituloId = useId();
  const resumenId = useId();

  // Crea el hilo de señal y, si se puede, le transfiere un lienzo nuevo. El
  // lienzo se crea aquí porque solo se puede transferir una vez.
  useEffect(() => {
    if (!hiloDisponible) {
      return undefined;
    }
    const cliente = (crearCliente ?? crearClientePorOmision)();
    clienteRef.current = cliente;
    const bajaErrores = cliente.suscribir({ alError: setErrorHilo });

    const contenedor = contenedorRef.current;
    let limpiarLienzo = (): void => undefined;
    if (grafica.tipo === 'lista' && contenedor !== null) {
      const lienzo = document.createElement('canvas');
      lienzo.setAttribute('aria-hidden', 'true');
      lienzo.style.width = '100%';
      lienzo.style.height = '100%';
      lienzo.style.display = 'block';
      contenedor.append(lienzo);
      cliente.adjuntarLienzo(grafica.transferir(lienzo), grafica.paleta, medir(contenedor));

      const observador =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(() => {
              cliente.redimensionar(medir(contenedor));
            });
      observador?.observe(contenedor);
      limpiarLienzo = () => {
        observador?.disconnect();
        lienzo.remove();
      };
    }

    return () => {
      limpiarLienzo();
      bajaErrores();
      cliente.terminar();
      clienteRef.current = null;
    };
  }, [hiloDisponible, crearCliente, grafica]);

  // Conecta la fuente actual al hilo de señal.
  useEffect(() => {
    const cliente = clienteRef.current;
    if (cliente === null || fuente === null) {
      return undefined;
    }
    const bajaIndices = cliente.suscribir({
      alIndices: (resultado) => {
        setLectura({ fuente, resultado });
      },
    });
    const desconectar = cliente.conectarFuente(fuente);
    return () => {
      desconectar();
      bajaIndices();
    };
  }, [fuente, hiloDisponible, crearCliente, grafica]);

  // Solo se muestran resultados de la fuente actual.
  const resultado = lectura !== null && lectura.fuente === fuente ? lectura.resultado : null;
  const calidad = resultado === null ? null : TEXTO_CALIDAD[resultado.calidad];

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
        Señal e indicadores
      </h2>

      <p role="status" style={{ marginBottom: 'var(--espacio-4)' }}>
        Calidad de la señal:{' '}
        <strong>
          {calidad === null ? (
            'Esperando datos de la señal'
          ) : (
            <>
              <span aria-hidden="true">{calidad.icono} </span>
              {calidad.texto}
            </>
          )}
        </strong>
      </p>

      {!hiloDisponible && (
        <p style={{ marginBottom: 'var(--espacio-4)' }}>
          El análisis de la señal no está disponible en este navegador.
        </p>
      )}
      {errorHilo !== null && (
        <p style={{ marginBottom: 'var(--espacio-4)' }}>
          No se pudo actualizar el análisis de la señal ({errorHilo}).
        </p>
      )}

      {grafica.tipo === 'lista' ? (
        <div
          ref={contenedorRef}
          role="img"
          aria-label="Tacograma: intervalos entre latidos de los últimos 5 minutos"
          aria-describedby={resumenId}
          style={{ height: 'var(--alto-grafica)', marginBottom: 'var(--espacio-4)' }}
        />
      ) : (
        <p style={{ marginBottom: 'var(--espacio-4)', color: 'var(--color-texto-secundario)' }}>
          La gráfica no está disponible: {grafica.motivo}. Los indicadores en texto siguen
          actualizándose.
        </p>
      )}

      <dl
        id={resumenId}
        style={{
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr',
          gap: 'var(--espacio-1) var(--espacio-4)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <dt>Frecuencia cardíaca media</dt>
        <dd data-testid="fc-media">{formatear(resultado?.fcMedia ?? null, 'lpm')}</dd>
        <dt>Variabilidad entre latidos (RMSSD)</dt>
        <dd data-testid="rmssd">{formatear(resultado?.rmssd ?? null, 'ms')}</dd>
        <dt>Variabilidad global (SDNN)</dt>
        <dd data-testid="sdnn">{formatear(resultado?.sdnn ?? null, 'ms')}</dd>
        <dt>Ventana analizada</dt>
        <dd data-testid="ventana">
          {formatearMinutos(resultado?.coberturaMs ?? 0)} de {formatearMinutos(VENTANA_ANALISIS_MS)}
        </dd>
        <dt>Latidos aceptados</dt>
        <dd data-testid="aceptados">{resultado?.latidosAceptados ?? 0}</dd>
        <dt>Descartados por calidad de señal</dt>
        <dd data-testid="descartados">{resultado?.latidosDescartados ?? 0}</dd>
      </dl>
    </section>
  );
}
