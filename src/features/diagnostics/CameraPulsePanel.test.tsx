import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { es } from '../../i18n/es';
import { CAMERA_FAILURES, CameraUnavailableError } from '../acquisition/camera/cameraCapture';
import type { FrameSample } from '../acquisition/camera/pulseDetector';
import { CameraPulsePanel, type StartCapture } from './CameraPulsePanel';

const text = es.acquisition.camera;

/** A fingertip pulsing once per second at 30 fps, lit by the torch. */
function fingertipFrames(seconds: number): FrameSample[] {
  return Array.from({ length: seconds * 30 }, (_, frame) => {
    const timeMs = (frame * 1000) / 30;
    const sinceBeat = (timeMs % 1000) - 500;
    return { timeMs, red: 210 - 8 * Math.exp(-((sinceBeat / 90) ** 2)), green: 40 };
  });
}

describe('CameraPulsePanel', () => {
  it('estimates the pulse from the frames of a covered lens', async () => {
    const user = userEvent.setup();
    let emit: (sample: FrameSample) => void = () => undefined;
    const stop = vi.fn();
    const start: StartCapture = (onFrame) => {
      emit = onFrame;
      return Promise.resolve({ torchOn: true, stop });
    };
    render(<CameraPulsePanel start={start} />);

    await user.click(screen.getByRole('button', { name: text.start }));
    expect(await screen.findByText(text.torch.on)).toBeVisible();
    act(() => { fingertipFrames(10).forEach((sample) => { emit(sample); }); });

    expect(screen.getByRole('status')).toHaveTextContent(text.statuses.detected);
    expect(screen.getByTestId('camera-pulse')).toHaveTextContent(es.common.withUnit('60', es.common.units.beatsPerMinute));

    await user.click(screen.getByRole('button', { name: text.stop }));
    expect(stop).toHaveBeenCalledOnce();
  });

  it('explains why the camera could not be opened', async () => {
    const user = userEvent.setup();
    const start: StartCapture = () => Promise.reject(new CameraUnavailableError('permission_denied'));
    render(<CameraPulsePanel start={start} />);
    await user.click(screen.getByRole('button', { name: text.start }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text.errors.permission_denied);
    expect(screen.getByRole('button', { name: text.start })).toBeEnabled();
  });

  it('has a message for every camera failure', () => {
    const errors: Readonly<Record<string, string>> = text.errors;
    for (const code of CAMERA_FAILURES) expect(errors[code]?.trim()).toBeTruthy();
  });
});
