import type { FrameSample } from './pulseDetector';

/** Frames are reduced to this size: only the average colour matters. */
const SAMPLE_WIDTH = 40;
const SAMPLE_HEIGHT = 30;

/** The camera could not be opened or read. */
export class CameraUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CameraUnavailableError';
  }
}

export interface CameraCapture {
  /** Whether the flashlight could be turned on; without it the signal is much weaker. */
  readonly torchOn: boolean;
  stop(): void;
}

/** `torch` is a camera capability not yet in TypeScript's DOM library. */
type TorchCapabilities = MediaTrackCapabilities & { readonly torch?: boolean };
type TorchConstraints = MediaTrackConstraintSet & { readonly torch?: boolean };

async function turnOnTorch(track: MediaStreamTrack): Promise<boolean> {
  const capabilities = track.getCapabilities() as TorchCapabilities;
  if (capabilities.torch !== true) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: true } as TorchConstraints] });
    return true;
  } catch {
    // Some phones list the torch but refuse it while streaming; the capture still works.
    return false;
  }
}

function describeFailure(cause: unknown): string {
  if (cause instanceof DOMException && cause.name === 'NotAllowedError') return 'No diste permiso para usar la cámara.';
  if (cause instanceof DOMException && cause.name === 'NotFoundError') return 'No se encontró ninguna cámara.';
  if (cause instanceof DOMException && cause.name === 'NotReadableError') return 'Otra aplicación está usando la cámara.';
  return 'No se pudo abrir la cámara.';
}

/**
 * Opens the rear camera, lights the torch when possible and reports the mean
 * red and green of every frame. Frame times come from the camera when the
 * browser exposes them, which keeps beat timing independent of rendering.
 */
export async function startCameraCapture(onFrame: (sample: FrameSample) => void): Promise<CameraCapture> {
  if (typeof navigator === 'undefined' || !('mediaDevices' in navigator)) {
    throw new CameraUnavailableError('Este navegador no permite usar la cámara. Usa Chrome en Android.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
    });
  } catch (cause) {
    throw new CameraUnavailableError(describeFailure(cause), { cause });
  }
  const stopTracks = (): void => { stream.getTracks().forEach((track) => { track.stop(); }); };

  const [track] = stream.getVideoTracks();
  const torchOn = track === undefined ? false : await turnOnTorch(track);
  const video = document.createElement('video');
  // Older browsers lack per-frame callbacks; animation frames are close enough there.
  const frameCallbacks = 'requestVideoFrameCallback' in video;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  try {
    if (context === null) throw new Error('2D context unavailable');
    await video.play();
  } catch (cause) {
    stopTracks();
    throw new CameraUnavailableError('No se pudo leer la imagen de la cámara.', { cause });
  }

  let active = true;
  let handle = 0;
  const sample = (timeMs: number): void => {
    context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    let red = 0;
    let green = 0;
    for (let i = 0; i < data.length; i += 4) {
      red += data[i] ?? 0;
      green += data[i + 1] ?? 0;
    }
    const pixels = data.length / 4;
    onFrame({ timeMs, red: red / pixels, green: green / pixels });
  };
  const schedule = (): void => {
    if (!active) return;
    if (frameCallbacks) {
      handle = video.requestVideoFrameCallback((_now, metadata) => {
        sample(metadata.captureTime ?? metadata.expectedDisplayTime);
        schedule();
      });
    } else {
      handle = requestAnimationFrame((now) => { sample(now); schedule(); });
    }
  };
  schedule();

  return {
    torchOn,
    stop: () => {
      active = false;
      if (frameCallbacks) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      stopTracks();
      video.srcObject = null;
    },
  };
}
