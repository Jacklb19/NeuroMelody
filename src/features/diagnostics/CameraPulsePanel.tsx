import { useEffect, useId, useRef, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { errorMessage } from '../../shared/errorMessage';
import { MS_PER_SECOND } from '../../shared/time';
import {
  CameraUnavailableError,
  startCameraCapture,
  type CameraCapture,
  type CameraFailure,
} from '../acquisition/camera/cameraCapture';
import {
  FRAME_RATE_WINDOW_MS,
  MIN_PULSE_INTERVALS,
  PULSE_INTERVALS,
  RECENT_INTERVALS,
  WAVEFORM_HEIGHT,
  WAVEFORM_LINE_WIDTH,
  WAVEFORM_MARGIN,
  WAVEFORM_MIN_AMPLITUDE,
  WAVEFORM_WIDTH,
} from '../acquisition/camera/config';
import { PulseDetector, type FrameSample } from '../acquisition/camera/pulseDetector';
import { bpmFromRrMs } from '../acquisition/heartRate';
import { PALETTE_VARIABLES } from '../signal/drawing/palette';

export type StartCapture = (onFrame: (sample: FrameSample) => void) => Promise<CameraCapture>;

interface Reading {
  readonly fingerDetected: boolean;
  readonly intervals: readonly number[];
  readonly framesPerSecond: number | null;
}

const EMPTY_READING: Reading = { fingerDetected: false, intervals: [], framesPerSecond: null };

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
}

function drawWaveform(canvas: HTMLCanvasElement | null, detector: PulseDetector, color: string): void {
  const context = canvas?.getContext('2d');
  if (canvas === null || context === null || context === undefined) return;
  const points = detector.waveform;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined || last.timeMs === first.timeMs) return;
  const amplitude = Math.max(...points.map((point) => Math.abs(point.value)), WAVEFORM_MIN_AMPLITUDE);
  context.strokeStyle = color;
  context.lineWidth = WAVEFORM_LINE_WIDTH;
  context.beginPath();
  points.forEach((point, i) => {
    const x = ((point.timeMs - first.timeMs) / (last.timeMs - first.timeMs)) * canvas.width;
    const y = canvas.height / 2 - (point.value / amplitude) * (canvas.height / 2 - WAVEFORM_MARGIN);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

/** Text for a failed start: camera failures by code, anything else by its own message. */
function describeCameraError(cause: unknown, texts: Readonly<Record<CameraFailure, string>>): string {
  if (cause instanceof CameraUnavailableError) return texts[cause.code];
  return errorMessage(cause, texts.open_failed);
}

/**
 * Prototype of proposal P-01 in /diagnostics: pulse from a fingertip over the
 * phone camera. It shows whether the signal is usable on the person's own
 * phone before the camera becomes a signal source.
 */
export function CameraPulsePanel({ start = startCameraCapture }: { readonly start?: StartCapture }): React.JSX.Element {
  const t = useMessages();
  const text = t.acquisition.camera;
  const [status, setStatus] = useState<'idle' | 'starting' | 'running'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [reading, setReading] = useState<Reading>(EMPTY_READING);
  const captureRef = useRef<CameraCapture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleId = useId();

  const stop = (): void => {
    captureRef.current?.stop();
    captureRef.current = null;
    setStatus('idle');
  };

  // Releases the camera when leaving the page.
  useEffect(() => () => { captureRef.current?.stop(); }, []);

  const begin = (): void => {
    const detector = new PulseDetector();
    const color = getComputedStyle(document.documentElement).getPropertyValue(PALETTE_VARIABLES.line).trim();
    let intervals: number[] = [];
    let finger = false;
    let frames = 0;
    let secondStartMs: number | null = null;

    const onFrame = (sample: FrameSample): void => {
      const beats = detector.push(sample);
      drawWaveform(canvasRef.current, detector, color);
      frames++;
      secondStartMs ??= sample.timeMs;
      const elapsedMs = sample.timeMs - secondStartMs;
      const fpsUpdate = elapsedMs >= FRAME_RATE_WINDOW_MS ? Math.round((frames * MS_PER_SECOND) / elapsedMs) : null;
      if (fpsUpdate !== null) { frames = 0; secondStartMs = sample.timeMs; }
      if (beats.length === 0 && detector.fingerDetected === finger && fpsUpdate === null) return;
      if (!detector.fingerDetected) intervals = [];
      intervals = [...intervals, ...beats].slice(-RECENT_INTERVALS);
      finger = detector.fingerDetected;
      setReading((previous) => ({
        fingerDetected: finger,
        intervals,
        framesPerSecond: fpsUpdate ?? previous.framesPerSecond,
      }));
    };

    setStatus('starting');
    setError(null);
    setReading(EMPTY_READING);
    start(onFrame).then(
      (capture) => {
        captureRef.current = capture;
        setTorchOn(capture.torchOn);
        setStatus('running');
      },
      (cause: unknown) => {
        setStatus('idle');
        setError(describeCameraError(cause, text.errors));
      },
    );
  };

  const recent = reading.intervals.slice(-PULSE_INTERVALS);
  // The median resists the occasional missed or doubled peak of the camera signal.
  const pulse = recent.length >= MIN_PULSE_INTERVALS ? Math.round(bpmFromRrMs(median(recent))) : null;
  const statusText = status !== 'running'
    ? text.statuses.off
    : !reading.fingerDetected
      ? text.statuses.noFinger
      : pulse === null ? text.statuses.gathering : text.statuses.detected;

  return (
    <section aria-labelledby={titleId} className="camera-pulse">
      <h2 id={titleId}>{text.title}</h2>
      <p className="secondary-text">
        {text.instructions}
      </p>
      <button
        type="button"
        className={status === 'running' ? 'button button-secondary' : 'button button-primary'}
        disabled={status === 'starting'}
        onClick={status === 'running' ? stop : begin}
      >
        {status === 'running' ? text.stop : status === 'starting' ? text.starting : text.start}
      </button>
      {error !== null && <p className="quiet-notice" role="alert">{error}</p>}
      <p role="status" className="connection-status">{text.statusLabel} <strong>{statusText}</strong></p>
      <canvas ref={canvasRef} className="camera-waveform" width={WAVEFORM_WIDTH} height={WAVEFORM_HEIGHT} aria-hidden="true" />
      <dl className="source-metrics">
        <dt>{text.metrics.pulse}</dt>
        <dd data-testid="camera-pulse">
          {pulse === null ? t.common.noValue : t.common.withUnit(String(pulse), t.common.units.beatsPerMinute)}
        </dd>
        <dt>{text.metrics.intervals}</dt>
        <dd>
          {reading.intervals.length === 0
            ? t.common.noValue
            : reading.intervals
              .map((rr) => t.common.withUnit(String(Math.round(rr)), t.common.units.milliseconds))
              .join(text.intervalSeparator)}
        </dd>
        <dt>{text.metrics.framesPerSecond}</dt>
        <dd>{reading.framesPerSecond ?? t.common.noValue}</dd>
        <dt>{text.metrics.torch}</dt>
        <dd>{status !== 'running' ? t.common.noValue : torchOn ? text.torch.on : text.torch.unavailable}</dd>
      </dl>
      <p className="panel-footnote">
        {text.footnote}
      </p>
    </section>
  );
}
