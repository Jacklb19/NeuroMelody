import { useEffect, useId, useRef, useState } from 'react';
import type { SignalSource } from '../acquisition/contract';
import type { CanvasDimensions } from './drawing/drawTachogram';
import { ChartPaletteError, readChartPalette, type ChartPalette } from './drawing/palette';
import { SignalThreadClient, createWorkerPort } from './thread/SignalThreadClient';
import type { SignalQuality, IndicesResult } from './processing/SignalProcessor';
import { ANALYSIS_WINDOW_MS } from './processing/thresholds';

type TransferCanvas = (canvas: HTMLCanvasElement) => OffscreenCanvas;

interface SignalPanelProps {
  readonly source: SignalSource | null;
  /** Permite usar un hilo de señal en el mismo proceso en las pruebas. */
  readonly createClient?: () => SignalThreadClient;
  readonly readPalette?: () => ChartPalette;
  /** `null` si el navegador no puede transferir un lienzo a un Worker. */
  readonly transferCanvas?: TransferCanvas | null;
}

type ChartState =
  | { readonly kind: 'ready'; readonly palette: ChartPalette; readonly transfer: TransferCanvas }
  | { readonly kind: 'unavailable'; readonly reason: string };

const QUALITY_TEXT: Readonly<Record<SignalQuality, { icon: string; text: string }>> = {
  collecting: { icon: '…', text: 'Reuniendo datos…' },
  good: { icon: '✓', text: 'Buena' },
  low: { icon: '△', text: 'Baja: revisa la colocación del dispositivo.' },
};

const createDefaultClient = (): SignalThreadClient => new SignalThreadClient(createWorkerPort());

function browserTransfer(): TransferCanvas | null {
  return typeof HTMLCanvasElement !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype
    ? (canvas) => canvas.transferControlToOffscreen()
    : null;
}

function evaluateChart(
  transfer: TransferCanvas | null,
  readPalette: () => ChartPalette,
): ChartState {
  if (transfer === null) {
    return { kind: 'unavailable', reason: 'Este navegador no puede dibujar la gráfica en segundo plano.' };
  }
  try {
    return { kind: 'ready', palette: readPalette(), transfer };
  } catch (error) {
    // Solo se oculta la gráfica: los indicadores en texto siguen funcionando.
    if (error instanceof ChartPaletteError) {
      return { kind: 'unavailable', reason: `Faltan estilos de la gráfica (${error.message})` };
    }
    throw error;
  }
}

function measure(container: HTMLElement): CanvasDimensions {
  const { width, height } = container.getBoundingClientRect();
  return { widthCss: width, heightCss: height, scale: window.devicePixelRatio || 1 };
}

function formatMinutes(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}

function format(value: number | null, unit: string): string {
  return value === null ? '—' : `${String(Math.round(value))} ${unit}`;
}

/**
 * Señal e indicadores (RF-05, RF-12). La gráfica se dibuja en el Worker de
 * señal sobre un lienzo transferido; la información completa está además en
 * texto (RNF-09): indicadores, ventana analizada y calidad de la señal, que
 * se anuncia a los lectores de pantalla solo cuando cambia.
 */
export function SignalPanel({
  source,
  createClient,
  readPalette = readChartPalette,
  transferCanvas,
}: SignalPanelProps): React.JSX.Element {
  const [chart] = useState<ChartState>(() =>
    evaluateChart(
      transferCanvas === undefined ? browserTransfer() : transferCanvas,
      readPalette,
    ),
  );
  const [threadAvailable] = useState(
    () => createClient !== undefined || typeof Worker !== 'undefined',
  );
  const [reading, setReading] = useState<{ source: SignalSource; result: IndicesResult } | null>(
    null,
  );
  const [threadError, setThreadError] = useState<string | null>(null);
  const clientRef = useRef<SignalThreadClient | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const summaryId = useId();

  // Crea el hilo de señal y, si se puede, le transfiere un lienzo nuevo. El
  // lienzo se crea aquí porque solo se puede transferir una vez.
  useEffect(() => {
    if (!threadAvailable) {
      return undefined;
    }
    const client = (createClient ?? createDefaultClient)();
    clientRef.current = client;
    const unsubscribeErrors = client.subscribe({ onError: setThreadError });

    const container = containerRef.current;
    let cleanupCanvas = (): void => undefined;
    if (chart.kind === 'ready' && container !== null) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.append(canvas);
      client.attachCanvas(chart.transfer(canvas), chart.palette, measure(container));

      const observer =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(() => {
              client.resize(measure(container));
            });
      observer?.observe(container);
      cleanupCanvas = () => {
        observer?.disconnect();
        canvas.remove();
      };
    }

    return () => {
      cleanupCanvas();
      unsubscribeErrors();
      client.terminate();
      clientRef.current = null;
    };
  }, [threadAvailable, createClient, chart]);

  // Conecta la fuente actual al hilo de señal.
  useEffect(() => {
    const client = clientRef.current;
    if (client === null || source === null) {
      return undefined;
    }
    const unsubscribeIndices = client.subscribe({
      onIndices: (result) => {
        setReading({ source, result });
      },
    });
    const disconnect = client.connectSource(source);
    return () => {
      disconnect();
      unsubscribeIndices();
    };
  }, [source, threadAvailable, createClient, chart]);

  // Solo se muestran resultados de la fuente actual.
  const result = reading !== null && reading.source === source ? reading.result : null;
  const quality = result === null ? null : QUALITY_TEXT[result.quality];

  return (
    <section
      aria-labelledby={titleId}
      style={{
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-8)',
      }}
    >
      <h2 id={titleId} style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
        Señal e indicadores
      </h2>

      <p role="status" style={{ marginBottom: 'var(--space-4)' }}>
        Calidad de la señal:{' '}
        <strong>
          {quality === null ? (
            'Esperando datos de la señal'
          ) : (
            <>
              <span aria-hidden="true">{quality.icon} </span>
              {quality.text}
            </>
          )}
        </strong>
      </p>

      {!threadAvailable && (
        <p style={{ marginBottom: 'var(--space-4)' }}>
          El análisis de la señal no está disponible en este navegador.
        </p>
      )}
      {threadError !== null && (
        <p style={{ marginBottom: 'var(--space-4)' }}>
          No se pudo actualizar el análisis de la señal ({threadError}).
        </p>
      )}

      {chart.kind === 'ready' ? (
        <div
          ref={containerRef}
          role="img"
          aria-label="Tacograma: intervalos entre latidos de los últimos 5 minutos"
          aria-describedby={summaryId}
          style={{ height: 'var(--chart-height)', marginBottom: 'var(--space-4)' }}
        />
      ) : (
        <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
          La gráfica no está disponible: {chart.reason}. Los indicadores en texto siguen
          actualizándose.
        </p>
      )}

      <dl
        id={summaryId}
        style={{
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr',
          gap: 'var(--space-1) var(--space-4)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <dt>Frecuencia cardíaca media</dt>
        <dd data-testid="mean-hr">{format(result?.meanHr ?? null, 'lpm')}</dd>
        <dt>Variabilidad entre latidos (RMSSD)</dt>
        <dd data-testid="rmssd">{format(result?.rmssd ?? null, 'ms')}</dd>
        <dt>Variabilidad global (SDNN)</dt>
        <dd data-testid="sdnn">{format(result?.sdnn ?? null, 'ms')}</dd>
        <dt>Ventana analizada</dt>
        <dd data-testid="analysis-window">
          {formatMinutes(result?.coverageMs ?? 0)} de {formatMinutes(ANALYSIS_WINDOW_MS)}
        </dd>
        <dt>Latidos aceptados</dt>
        <dd data-testid="accepted-beats">{result?.acceptedBeats ?? 0}</dd>
        <dt>Descartados por calidad de señal</dt>
        <dd data-testid="discarded-beats">{result?.discardedBeats ?? 0}</dd>
      </dl>
    </section>
  );
}
