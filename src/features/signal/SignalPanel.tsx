import { useEffect, useId, useRef, useState } from 'react';
import type { Formatters } from '../../i18n/formatters';
import { useFormatters, useMessages, type Messages } from '../../i18n/messages';
import type { SignalSource } from '../acquisition/contract';
import { chartLabelsFrom, type ChartLabels } from './drawing/chartLabels';
import type { CanvasDimensions } from './drawing/drawTachogram';
import {
  ChartPaletteError,
  readChartPalette,
  type ChartPalette,
  type ChartPaletteErrorCode,
} from './drawing/palette';
import { formatSignalTime } from './formatSignalTime';
import { LF_HF_RATIO_DECIMALS, QUALITY_ICONS } from './presentation';
import type { IndicesResult } from './processing/SignalProcessor';
import { ANALYSIS_WINDOW_MS, MAX_GAP_MS, MIN_SPECTRUM_MS } from './processing/thresholds';
import { MS_PER_MINUTE } from '../../shared/time';
import { SignalThreadClient, createWorkerPort } from './thread/SignalThreadClient';
import {
  WORKER_CRASHED,
  type SignalThreadErrorCode,
  type SignalThreadFailure,
} from './thread/protocol';

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

/** Why the chart cannot be shown; worded from the dictionary when rendering. */
type ChartUnavailableReason =
  | { readonly kind: 'no_offscreen_canvas' }
  | { readonly kind: 'palette'; readonly error: ChartPaletteError };

/** Like the palette, the canvas labels are prepared once, when the canvas is created. */
type ChartState =
  | {
      readonly kind: 'ready';
      readonly palette: ChartPalette;
      readonly labels: ChartLabels;
      readonly transfer: TransferCanvas;
    }
  | { readonly kind: 'unavailable'; readonly reason: ChartUnavailableReason };

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
  labels: ChartLabels,
): ChartState {
  if (transfer === null) {
    return { kind: 'unavailable', reason: { kind: 'no_offscreen_canvas' } };
  }
  try {
    return { kind: 'ready', palette: readPalette(), labels, transfer };
  } catch (error) {
    // Hide only the chart; the text indicators continue working.
    if (error instanceof ChartPaletteError) {
      return { kind: 'unavailable', reason: { kind: 'palette', error } };
    }
    throw error;
  }
}

function describeChartUnavailable(reason: ChartUnavailableReason, t: Messages['signal']): string {
  if (reason.kind === 'no_offscreen_canvas') {
    return t.chart.noOffscreenCanvas;
  }
  // Typed against the codes so a new palette error cannot lack its message.
  const paletteErrors: Readonly<Record<ChartPaletteErrorCode, (detail: string) => string>> =
    t.chart.paletteErrors;
  return t.chart.stylesMissing(paletteErrors[reason.error.code](reason.error.detail));
}

function describeThreadFailure(failure: SignalThreadFailure, t: Messages['signal']): string {
  // Only the browser knows why its Worker crashed, so its words are shown as given.
  if (failure.code === WORKER_CRASHED) {
    return failure.detail;
  }
  const errors: Readonly<Record<SignalThreadErrorCode, string>> = t.errors;
  return errors[failure.code];
}

function measure(container: HTMLElement): CanvasDimensions {
  const { width, height } = container.getBoundingClientRect();
  return { widthCss: width, heightCss: height, scale: window.devicePixelRatio || 1 };
}

/** Whole figure with its unit, or the placeholder while it cannot be computed. */
function formatWithUnit(value: number | null, unit: string, common: Messages['common']): string {
  return value === null ? common.noValue : common.withUnit(String(Math.round(value)), unit);
}

/** The spectrum needs {@link MIN_SPECTRUM_MS} of continuous signal, so its absence is explained. */
function formatRatio(result: IndicesResult | null, t: Messages, format: Formatters): string {
  if (result?.lfHfRatio == null) {
    return result?.lfPower == null
      ? t.signal.spectrumCollecting(
          t.common.withUnit(String(MIN_SPECTRUM_MS / MS_PER_MINUTE), t.common.units.minutes),
        )
      : t.common.noValue;
  }
  return format.decimal(result.lfHfRatio, LF_HF_RATIO_DECIMALS);
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
  const t = useMessages();
  const format = useFormatters();
  const [chart] = useState<ChartState>(() =>
    evaluateChart(
      transferCanvas === undefined ? browserTransfer() : transferCanvas,
      readPalette,
      chartLabelsFrom(t.common),
    ),
  );
  const [threadAvailable] = useState(
    () => createClient !== undefined || typeof Worker !== 'undefined',
  );
  const [reading, setReading] = useState<{ source: SignalSource; result: IndicesResult } | null>(
    null,
  );
  const [threadError, setThreadError] = useState<SignalThreadFailure | null>(null);
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
      client.attachCanvas(chart.transfer(canvas), chart.palette, chart.labels, measure(container));

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
  const quality = result === null ? null : result.quality;
  const { metrics } = t.signal;
  const { units } = t.common;

  return (
    <section
      aria-labelledby={titleId}
      className="signal-panel"
    >
      <h2 id={titleId}>
        {t.signal.title}
      </h2>

      <p role="status" className="signal-status">
        {t.signal.qualityLabel}{' '}
        <strong>
          {quality === null ? (
            t.signal.waitingForData
          ) : (
            <>
              <span aria-hidden="true">{QUALITY_ICONS[quality]} </span>
              {t.signal.quality[quality]}
            </>
          )}
        </strong>
      </p>

      {!threadAvailable && (
        <p>
          {t.signal.threadUnavailable}
        </p>
      )}
      {threadError !== null && (
        <p>
          {t.signal.threadFailed(describeThreadFailure(threadError, t.signal))}
        </p>
      )}

      {chart.kind === 'ready' ? (
        <div
          ref={containerRef}
          role="img"
          aria-label={t.signal.chart.accessibleName(ANALYSIS_WINDOW_MS / MS_PER_MINUTE)}
          aria-describedby={summaryId}
          className="signal-chart"
        />
      ) : (
        <p>
          {t.signal.chart.unavailable(describeChartUnavailable(chart.reason, t.signal))}
        </p>
      )}

      <dl
        id={summaryId}
        className="signal-metrics"
      >
        <dt>{metrics.meanHr}</dt>
        <dd data-testid="mean-hr">{formatWithUnit(result?.meanHr ?? null, units.beatsPerMinute, t.common)}</dd>
        <dt>{metrics.rmssd}</dt>
        <dd data-testid="rmssd">{formatWithUnit(result?.rmssd ?? null, units.milliseconds, t.common)}</dd>
        <dt>{metrics.sdnn}</dt>
        <dd data-testid="sdnn">{formatWithUnit(result?.sdnn ?? null, units.milliseconds, t.common)}</dd>
        <dt>{metrics.lfPower}</dt>
        <dd data-testid="lf-power">{formatWithUnit(result?.lfPower ?? null, units.squaredMilliseconds, t.common)}</dd>
        <dt>{metrics.hfPower}</dt>
        <dd data-testid="hf-power">{formatWithUnit(result?.hfPower ?? null, units.squaredMilliseconds, t.common)}</dd>
        <dt>{metrics.lfHfRatio}</dt>
        <dd data-testid="lf-hf-ratio">{formatRatio(result, t, format)}</dd>
        <dt>{metrics.analysisWindow}</dt>
        <dd data-testid="analysis-window">
          {t.signal.windowCoverage(formatSignalTime(result?.coverageMs ?? 0), formatSignalTime(ANALYSIS_WINDOW_MS))}
        </dd>
        <dt>{metrics.acceptedBeats}</dt>
        <dd data-testid="accepted-beats">{result?.acceptedBeats ?? 0}</dd>
        <dt>{metrics.discardedBeats}</dt>
        <dd data-testid="discarded-beats">{result?.discardedBeats ?? 0}</dd>
      </dl>
    </section>
  );
}
