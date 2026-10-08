import { describe, expect, it, vi, type Mock } from 'vitest';
import type { BeatNotification, ConnectionState } from '../contract';
import { BEATS_FOR_HR, NOTIFICATION_PERIOD_MS } from '../config';
import { bpmFromRrMs, heartRateFromRr } from '../heartRate';
import { CameraSource } from './CameraSource';
import { CameraUnavailableError, type CameraCapture, type StartCameraCapture } from './cameraCapture';
import type { FrameSample } from './pulseDetector';
import { MACRO_RR, syntheticPpg, uncoveredFrames } from './syntheticPpg';

/** Camera timestamps are far from zero, like `performance.now()`. */
const CAMERA_START_MS = 1_000_000;
/** Tolerance of each detected interval against the synthetic one, as in the detector tests. */
const RR_TOLERANCE_MS = 15;

interface FakeCamera {
  readonly start: Mock<StartCameraCapture>;
  readonly stop: Mock<() => void>;
  /** Delivers frames as the camera would, one callback each. */
  emit(frames: readonly FrameSample[]): void;
  /** The system takes the camera away after it opened. */
  fail(error: CameraUnavailableError): void;
}

function createFakeCamera(): FakeCamera {
  let onFrame: ((sample: FrameSample) => void) | null = null;
  let onFailure: ((error: CameraUnavailableError) => void) | undefined;
  const stop = vi.fn<() => void>();
  const start = vi.fn<StartCameraCapture>((frameCallback, failureCallback) => {
    onFrame = frameCallback;
    onFailure = failureCallback;
    return Promise.resolve({ torchOn: true, stop });
  });
  return {
    start,
    stop,
    emit: (frames) => {
      frames.forEach((frame) => onFrame?.(frame));
    },
    fail: (error) => {
      onFailure?.(error);
    },
  };
}

async function connectedSource() {
  const camera = createFakeCamera();
  const source = new CameraSource({ start: camera.start });
  const notifications: BeatNotification[] = [];
  const onError = vi.fn();
  source.subscribe({ onNotification: (notification) => notifications.push(notification), onError });
  await source.connect();
  return { camera, source, notifications, onError };
}

/** Notifications a fresh source produces for `frames`. */
async function notificationsFor(frames: readonly FrameSample[]): Promise<BeatNotification[]> {
  const { camera, notifications } = await connectedSource();
  camera.emit(frames);
  return notifications;
}

/** Whether `detected` matches a run of `expected` starting near its beginning. */
function matchesReference(detected: readonly number[], expected: readonly number[]): boolean {
  return Array.from({ length: expected.length - detected.length + 1 }, (_, offset) => offset).some((offset) =>
    detected.every((rr, i) => Math.abs(rr - (expected[offset + i] ?? Infinity)) < RR_TOLERANCE_MS));
}

describe('CameraSource', () => {
  it('requests the camera within the gesture and goes through connecting to connected', async () => {
    const camera = createFakeCamera();
    const source = new CameraSource({ start: camera.start });
    const states: ConnectionState[] = [];
    source.subscribe({ onStateChange: (state) => states.push(state) });

    const connecting = source.connect();
    // getUserMedia must run before the first await, or the click no longer counts as a gesture.
    expect(camera.start).toHaveBeenCalledOnce();
    await connecting;

    expect(source.kind).toBe('camera');
    expect(states).toEqual(['connecting', 'connected']);
  });

  it('notifies once per second of signal time with the detected intervals and heart rate', async () => {
    const { camera, notifications, onError } = await connectedSource();
    const { frames, rr } = syntheticPpg(30, 1, CAMERA_START_MS);
    camera.emit(frames);

    const times = notifications.map((notification) => notification.timeMs);
    const firstTime = times[0] ?? 0;
    // Signal time counts from the first frame, not from the camera clock.
    expect(firstTime % NOTIFICATION_PERIOD_MS).toBe(0);
    expect(times.at(-1)).toBeLessThanOrEqual((frames.at(-1)?.timeMs ?? 0) - CAMERA_START_MS);
    expect(times).toEqual(times.map((_, i) => firstTime + i * NOTIFICATION_PERIOD_MS));

    const detected = notifications.flatMap((notification) => notification.rrIntervalsMs);
    expect(detected.length).toBeGreaterThanOrEqual(rr.length - 4);
    expect(matchesReference(detected, rr)).toBe(true);

    // Plausible: the heart rate of the synthetic intervals, widened by the detection tolerance.
    const slowest = Math.floor(bpmFromRrMs(Math.max(...MACRO_RR) + RR_TOLERANCE_MS));
    const fastest = Math.ceil(bpmFromRrMs(Math.min(...MACRO_RR) - RR_TOLERANCE_MS));
    notifications.forEach((notification) => {
      expect(notification.sensorContact).toBe(true);
      expect(notification.heartRate).toBeGreaterThanOrEqual(slowest);
      expect(notification.heartRate).toBeLessThanOrEqual(fastest);
    });
    // Every notification passed the boundary validation.
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports nothing before the first beat, since there is no heart rate yet', async () => {
    const { camera, source, notifications } = await connectedSource();
    camera.emit(uncoveredFrames(CAMERA_START_MS, 5 * NOTIFICATION_PERIOD_MS));

    expect(notifications).toEqual([]);
    expect(source.state).toBe('connected');
  });

  it('marks the contact loss with the last heart rate when the finger leaves the lens', async () => {
    const { camera, notifications, onError } = await connectedSource();
    const { frames } = syntheticPpg(12, 1, CAMERA_START_MS);
    camera.emit(frames);
    const withContact = notifications.length;
    expect(withContact).toBeGreaterThan(0);

    camera.emit(uncoveredFrames((frames.at(-1)?.timeMs ?? 0) + 1, 3 * NOTIFICATION_PERIOD_MS));

    const afterLoss = notifications.slice(withContact);
    const allIntervals = notifications.flatMap((notification) => notification.rrIntervalsMs);
    const lastHeartRate = heartRateFromRr(allIntervals.slice(-BEATS_FOR_HR));
    expect(afterLoss.length).toBeGreaterThanOrEqual(2);
    afterLoss.forEach((notification) => {
      expect(notification.sensorContact).toBe(false);
      expect(notification.heartRate).toBe(lastHeartRate);
    });
    // Beats completed just before the loss may ride on the first one; none come after it.
    expect(afterLoss.slice(1).flatMap((notification) => notification.rrIntervalsMs)).toEqual([]);
    expect(onError).not.toHaveBeenCalled();
  });

  it('goes to error with the camera failure when the capture cannot start', async () => {
    const failure = new CameraUnavailableError('permission_denied');
    const source = new CameraSource({ start: () => Promise.reject(failure) });
    const states: ConnectionState[] = [];
    const onError = vi.fn();
    source.subscribe({ onStateChange: (state) => states.push(state), onError });

    await source.connect();

    expect(states).toEqual(['connecting', 'error']);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('reports an unclassified failure as a camera that could not open', async () => {
    const source = new CameraSource({ start: () => Promise.reject(new TypeError('boom')) });
    const onError = vi.fn<(error: Error) => void>();
    source.subscribe({ onError });

    await source.connect();

    expect(source.state).toBe('error');
    const [[error]] = onError.mock.calls as [[Error]];
    expect(error).toBeInstanceOf(CameraUnavailableError);
    expect((error as CameraUnavailableError).code).toBe('open_failed');
  });

  it('stops the capture once and notifies nothing after disconnecting', async () => {
    const { camera, source, notifications } = await connectedSource();
    const { frames } = syntheticPpg(20, 1, CAMERA_START_MS);
    const half = Math.floor(frames.length / 2);
    camera.emit(frames.slice(0, half));
    expect(notifications.length).toBeGreaterThan(0);

    await source.disconnect();
    const delivered = notifications.length;
    camera.emit(frames.slice(half));
    await source.disconnect();

    expect(notifications).toHaveLength(delivered);
    expect(camera.stop).toHaveBeenCalledOnce();
    expect(source.state).toBe('disconnected');
  });

  it('goes to error when the system takes the camera away mid-session', async () => {
    const { camera, source, notifications, onError } = await connectedSource();
    const { frames } = syntheticPpg(16, 1, CAMERA_START_MS);
    const half = Math.floor(frames.length / 2);
    camera.emit(frames.slice(0, half));
    const delivered = notifications.length;
    expect(delivered).toBeGreaterThan(0);

    const lost = new CameraUnavailableError('unreadable');
    camera.fail(lost);
    camera.emit(frames.slice(half));

    expect(source.state).toBe('error');
    expect(onError).toHaveBeenCalledWith(lost);
    expect(notifications).toHaveLength(delivered);
  });

  it('shows no reading while the finger settles, before its first interval', async () => {
    const { camera, notifications } = await connectedSource();
    const { frames } = syntheticPpg(12, 1, CAMERA_START_MS);
    // Two seconds of a covered lens: the detector is still filling its baseline.
    camera.emit(frames.filter((frame) => frame.timeMs - CAMERA_START_MS < 2 * NOTIFICATION_PERIOD_MS));

    expect(notifications).toEqual([]);
  });

  it('does not repeat the previous reading when the finger comes back', async () => {
    const { camera, notifications } = await connectedSource();
    const first = syntheticPpg(12, 1, CAMERA_START_MS).frames;
    camera.emit(first);
    const lossStartMs = (first.at(-1)?.timeMs ?? 0) + 1;
    camera.emit(uncoveredFrames(lossStartMs, 3 * NOTIFICATION_PERIOD_MS));
    const beforeReturn = notifications.length;

    // The finger is back, but this contact has no interval yet.
    const back = syntheticPpg(12, 2, lossStartMs + 3 * NOTIFICATION_PERIOD_MS).frames;
    const returnStartMs = back[0]?.timeMs ?? 0;
    camera.emit(back.filter((frame) => frame.timeMs - returnStartMs < 2 * NOTIFICATION_PERIOD_MS));

    expect(notifications.slice(beforeReturn).filter((notification) => notification.sensorContact)).toEqual([]);
  });

  it('ignores repeated, backward and non-finite frame times', async () => {
    const { frames } = syntheticPpg(16, 1, CAMERA_START_MS);
    const clean = await notificationsFor(frames);
    const middle = Math.floor(frames.length / 2);
    const middleFrame = frames[middle] as FrameSample;
    const noisy = [
      ...frames.slice(0, middle + 1),
      { ...middleFrame },
      { ...middleFrame, timeMs: middleFrame.timeMs - NOTIFICATION_PERIOD_MS },
      { ...middleFrame, timeMs: Number.NaN },
      ...frames.slice(middle + 1),
    ];

    expect(await notificationsFor(noisy)).toEqual(clean);
  });

  it('catches up period by period when frames arrive late', async () => {
    const { camera, notifications, onError } = await connectedSource();
    const { frames } = syntheticPpg(20, 1, CAMERA_START_MS);
    const gapStart = Math.floor(frames.length / 2);
    const gapStartMs = (frames[gapStart] as FrameSample).timeMs;
    // No frame for three notification periods, as when the browser throttles the page.
    camera.emit(frames.filter((frame) => frame.timeMs < gapStartMs || frame.timeMs >= gapStartMs + 3 * NOTIFICATION_PERIOD_MS));

    const times = notifications.map((notification) => notification.timeMs);
    expect(times.length).toBeGreaterThan(3);
    times.slice(1).forEach((time, i) => {
      expect(time - (times[i] ?? 0)).toBe(NOTIFICATION_PERIOD_MS);
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores frames delivered before the source is connected', async () => {
    const { frames } = syntheticPpg(12, 1, CAMERA_START_MS);
    const expected = await notificationsFor(frames);

    const early = uncoveredFrames(CAMERA_START_MS - 5 * NOTIFICATION_PERIOD_MS, 2 * NOTIFICATION_PERIOD_MS);
    let deliver: (sample: FrameSample) => void = () => undefined;
    const source = new CameraSource({
      start: (onFrame) => {
        deliver = onFrame;
        // The camera already produces frames while it is still opening.
        early.forEach((frame) => { onFrame(frame); });
        return Promise.resolve({ torchOn: true, stop: vi.fn() });
      },
    });
    const notifications: BeatNotification[] = [];
    source.subscribe({ onNotification: (notification) => notifications.push(notification) });
    await source.connect();
    frames.forEach((frame) => { deliver(frame); });

    expect(notifications).toEqual(expected);
  });

  it('releases a camera that finishes opening after the source was disconnected', async () => {
    let open: (capture: CameraCapture) => void = () => undefined;
    const stop = vi.fn<() => void>();
    const source = new CameraSource({ start: () => new Promise((resolve) => { open = resolve; }) });

    const connecting = source.connect();
    await source.disconnect();
    open({ torchOn: false, stop });
    await connecting;

    expect(stop).toHaveBeenCalledOnce();
    expect(source.state).toBe('disconnected');
  });
});
