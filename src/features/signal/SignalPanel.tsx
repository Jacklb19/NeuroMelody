import { useEffect, useId, useRef, useState } from 'react';
import type { SignalSource } from '../acquisition/contract';
import type { CanvasDimensions } from './drawing/drawTachogram';
import { ChartPaletteError, readChartPalette, type ChartPalette } from './drawing/palette';
import { SignalThreadClient, createWorkerPort } from './thread/SignalThreadClient';
import type { SignalQuality, IndicesResult } from './processing/SignalProcessor';
import { ANALYSIS_WINDOW_MS, MAX_GAP_MS } from './processing/thresholds';

type TransferCanvas = (canvas: HTMLCanvasElement) => OffscreenCanvas;

interface SignalPanelProps {
  readonly source: SignalSource | null;
  /** Allows an in-process signal thread in tests. */
  readonly createClient?: () => SignalThreadClient;
  readonly readPalette?: () => ChartPalette;
  /** Null when the browser cannot transfer a canvas to a Worker. */
  readonly transferCanvas?: TransferCanvas | null;
  readonly onIndices?: (result: IndicesResult) => void;
  readonly onReset?: () => void;
  readonly onUnavailable?: () => void;
  readonly onPulse?: () => void;
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
    // Hide only the chart; the text indicators continue working.
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
 * Signal and indicators (RF-05, RF-12). The signal Worker draws the chart on
 * a transferred canvas. Text exposes all indicators and the analysis window
 * (RNF-09); signal quality is announced only when it changes.
 */
export function SignalPanel({
  source,
  createClient,
  readPalette = readChartPalette,
  transferCanvas,
  onIndices,
  onReset,
  onUnavailable,
  onPulse,
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

  // Create the canvas here because each canvas can only be transferred once.
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

  // Connect the current source to the signal thread.
  useEffect(() => {
    const client = clientRef.current;
    if (client === null || source === null) {
      onUnavailable?.();
      return undefined;
    }
    onReset?.();
    const unsubscribeIndices = client.subscribe({
      onIndices: (result) => {
        setReading({ source, result });
        if (source.state === 'connected') onIndices?.(result);
      },
      onError: () => onUnavailable?.(),
    });
    let lastRrTimeMs = 0;
    const unsubscribeSource = source.subscribe({
      onNotification: notification => {
        if (notification.rrIntervalsMs.length > 0) lastRrTimeMs = notification.timeMs;
        if (notification.sensorContact === false || notification.timeMs - lastRrTimeMs > MAX_GAP_MS) onUnavailable?.();
        else onPulse?.();
      },
      onStateChange: state => {
        if (state === 'connecting') onReset?.();
        else if (state !== 'connected') onUnavailable?.();
      },
    });
    const disconnect = client.connectSource(source);
    return () => {
      disconnect();
      unsubscribeIndices();
      unsubscribeSource();
    };
  }, [source, threadAvailable, createClient, chart, onIndices, onReset, onUnavailable, onPulse]);

  // Display results only from the current source.
  const result = reading !== null && reading.source === source ? reading.result : null;
  const quality = result === null ? null : QUALITY_TEXT[result.quality];

  return (
    <section
      aria-labelledby={titleId}
      className="signal-panel"
    >
      <h2 id={titleId}>
        Señal e indicadores
      </h2>

      <p role="status" className="signal-status">
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
        <p>
          El análisis de la señal no está disponible en este navegador.
        </p>
      )}
      {threadError !== null && (
        <p>
          No se pudo actualizar el análisis de la señal ({threadError}).
        </p>
      )}

      {chart.kind === 'ready' ? (
        <div
          ref={containerRef}
          role="img"
          aria-label="Tacograma: intervalos entre latidos de los últimos 5 minutos"
          aria-describedby={summaryId}
          className="signal-chart"
        />
      ) : (
        <p>
          La gráfica no está disponible: {chart.reason}. Los indicadores en texto siguen
          actualizándose.
        </p>
      )}

      <dl
        id={summaryId}
        className="signal-metrics"
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
