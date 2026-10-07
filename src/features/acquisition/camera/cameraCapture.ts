import {
  CAMERA_FACING_MODE,
  CAMERA_FRAME_RATE,
  CAPTURE_HEIGHT,
  CAPTURE_WIDTH,
  SAMPLE_HEIGHT,
  SAMPLE_WIDTH,
} from './config';
import type { FrameSample } from './pulseDetector';

/** Why the camera could not be used; the interface turns each code into text. */
export const CAMERA_FAILURES = [
  'unsupported',
  'permission_denied',
  'not_found',
  'busy',
  'open_failed',
  'unreadable',
] as const;

export type CameraFailure = (typeof CAMERA_FAILURES)[number];

/** The camera could not be opened or read. */
export class CameraUnavailableError extends Error {
  readonly code: CameraFailure;

  constructor(code: CameraFailure, options?: ErrorOptions) {
    super(`Camera unavailable: ${code}`, options);
    this.name = 'CameraUnavailableError';
    this.code = code;
  }
}

export interface CameraCapture {
  /** Whether the flashlight could be turned on; without it the signal is much weaker. */
  readonly torchOn: boolean;
  stop(): void;
}

/**
 * Opens the camera and calls `onFrame` with every frame until the capture is
 * stopped. `onFailure` reports a camera lost after it opened (another app
 * took it, permission revoked): without it the frames would just stop.
 */
export type StartCameraCapture = (
  onFrame: (sample: FrameSample) => void,
  onFailure?: (error: CameraUnavailableError) => void,
) => Promise<CameraCapture>;

/**
 * Whether the browser exposes the camera API. It is missing in old browsers
 * and outside secure contexts (plain HTTP on a local network address).
 */
export function cameraApiAvailable(): boolean {
  return typeof navigator !== 'undefined'
    && 'mediaDevices' in navigator
    && typeof navigator.mediaDevices.getUserMedia === 'function';
}

/** `torch` is a camera capability not yet in TypeScript's DOM library. */
type TorchCapabilities = MediaTrackCapabilities & { readonly torch?: boolean };
type TorchConstraints = MediaTrackConstraintSet & { readonly torch?: boolean };

/** Bytes per pixel of canvas image data (red, green, blue, alpha). */
const RGBA_CHANNELS = 4;

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

/** Classifies a failed `getUserMedia`; the browser reports its reasons as DOMException names. */
function failureOf(cause: unknown): CameraFailure {
  if (cause instanceof DOMException && cause.name === 'NotAllowedError') return 'permission_denied';
  if (cause instanceof DOMException && cause.name === 'NotFoundError') return 'not_found';
  if (cause instanceof DOMException && cause.name === 'NotReadableError') return 'busy';
  return 'open_failed';
}

/**
 * Opens the rear camera, lights the torch when possible and reports the mean
 * red and green of every frame. Frame times come from the camera when the
 * browser exposes them, which keeps beat timing independent of rendering.
 */
export async function startCameraCapture(
  onFrame: (sample: FrameSample) => void,
  onFailure?: (error: CameraUnavailableError) => void,
): Promise<CameraCapture> {
  if (!cameraApiAvailable()) {
    throw new CameraUnavailableError('unsupported');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: CAMERA_FACING_MODE },
        width: { ideal: CAPTURE_WIDTH },
        height: { ideal: CAPTURE_HEIGHT },
        frameRate: { ideal: CAMERA_FRAME_RATE },
      },
    });
  } catch (cause) {
    throw new CameraUnavailableError(failureOf(cause), { cause });
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
    throw new CameraUnavailableError('unreadable', { cause });
  }

  let active = true;
  let handle = 0;
  const cancelFrames = (): void => {
    active = false;
    if (frameCallbacks) video.cancelVideoFrameCallback(handle);
    else cancelAnimationFrame(handle);
  };
  // `ended` fires only when the system ends the track; our own stop() does not fire it.
  const onTrackEnded = (): void => {
    if (!active) return;
    cancelFrames();
    stopTracks();
    onFailure?.(new CameraUnavailableError('unreadable'));
  };
  track?.addEventListener('ended', onTrackEnded);
  const sample = (timeMs: number): void => {
    context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    let red = 0;
    let green = 0;
    for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
      red += data[i] ?? 0;
      green += data[i + 1] ?? 0;
    }
    const pixels = data.length / RGBA_CHANNELS;
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
      track?.removeEventListener('ended', onTrackEnded);
      cancelFrames();
      stopTracks();
      video.srcObject = null;
    },
  };
}
