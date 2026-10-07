import { useEffect, useId, useRef, useState } from 'react';
import { startCameraCapture, type CameraCapture } from '../acquisition/camera/cameraCapture';
import { PulseDetector, type FrameSample } from '../acquisition/camera/pulseDetector';

export type StartCapture = (onFrame: (sample: FrameSample) => void) => Promise<CameraCapture>;

/** Intervals shown in the list and used for the pulse estimate. */
const RECENT_INTERVALS = 8;
const PULSE_INTERVALS = 5;

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
  const amplitude = Math.max(...points.map((point) => Math.abs(point.value)), 1);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  points.forEach((point, i) => {
    const x = ((point.timeMs - first.timeMs) / (last.timeMs - first.timeMs)) * canvas.width;
    const y = canvas.height / 2 - (point.value / amplitude) * (canvas.height / 2 - 4);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

/**
 * Prototype of proposal P-01 in /diagnostics: pulse from a fingertip over the
 * phone camera. It shows whether the signal is usable on the person's own
 * phone before the camera becomes a signal source.
 */
export function CameraPulsePanel({ start = startCameraCapture }: { readonly start?: StartCapture }): React.JSX.Element {
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
    const color = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-line').trim();
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
      const fpsUpdate = elapsedMs >= 1000 ? Math.round((frames * 1000) / elapsedMs) : null;
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
        setError(cause instanceof Error ? cause.message : 'No se pudo abrir la cámara.');
      },
    );
  };

  const recent = reading.intervals.slice(-PULSE_INTERVALS);
  const pulse = recent.length >= 3 ? Math.round(60000 / median(recent)) : null;
  const statusText = status !== 'running'
    ? 'La cámara está apagada.'
    : !reading.fingerDetected
      ? 'Cubre la cámara trasera con la yema del dedo.'
      : pulse === null ? 'Dedo detectado: reuniendo latidos…' : 'Pulso detectado.';

  return (
    <section aria-labelledby={titleId} className="camera-pulse">
      <h2 id={titleId}>Pulso con la cámara (prototipo)</h2>
      <p className="secondary-text">
        Cubre la cámara trasera con la yema del dedo, sin apretar, y mantén la mano quieta. Si tu celular lo permite,
        la linterna se enciende sola. Funciona mejor en Chrome para Android.
      </p>
      <button
        type="button"
        className={status === 'running' ? 'button button-secondary' : 'button button-primary'}
        disabled={status === 'starting'}
        onClick={status === 'running' ? stop : begin}
      >
        {status === 'running' ? 'Apagar la cámara' : status === 'starting' ? 'Abriendo la cámara…' : 'Probar con la cámara'}
      </button>
      {error !== null && <p className="quiet-notice" role="alert">{error}</p>}
      <p role="status" className="connection-status">Estado: <strong>{statusText}</strong></p>
      <canvas ref={canvasRef} className="camera-waveform" width={600} height={120} aria-hidden="true" />
      <dl className="source-metrics">
        <dt>Pulso estimado</dt>
        <dd data-testid="camera-pulse">{pulse === null ? '—' : `${String(pulse)} lpm`}</dd>
        <dt>Últimos intervalos</dt>
        <dd>{reading.intervals.length === 0 ? '—' : reading.intervals.map((rr) => `${String(Math.round(rr))} ms`).join(' · ')}</dd>
        <dt>Imágenes por segundo</dt>
        <dd>{reading.framesPerSecond ?? '—'}</dd>
        <dt>Linterna</dt>
        <dd>{status !== 'running' ? '—' : torchOn ? 'Encendida' : 'No disponible: usa buena luz'}</dd>
      </dl>
      <p className="panel-footnote">
        Prueba para decidir si la cámara sirve como fuente de señal. Es menos precisa que una banda de pecho y no es
        una medida clínica. La imagen se procesa en el dispositivo y no se guarda.
      </p>
    </section>
  );
}
