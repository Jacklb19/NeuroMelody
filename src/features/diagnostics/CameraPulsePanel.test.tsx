import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CameraUnavailableError } from '../acquisition/camera/cameraCapture';
import type { FrameSample } from '../acquisition/camera/pulseDetector';
import { CameraPulsePanel, type StartCapture } from './CameraPulsePanel';

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

    await user.click(screen.getByRole('button', { name: 'Probar con la cámara' }));
    expect(await screen.findByText('Encendida')).toBeVisible();
    act(() => { fingertipFrames(10).forEach((sample) => { emit(sample); }); });

    expect(screen.getByRole('status')).toHaveTextContent('Pulso detectado.');
    expect(screen.getByTestId('camera-pulse')).toHaveTextContent('60 lpm');

    await user.click(screen.getByRole('button', { name: 'Apagar la cámara' }));
    expect(stop).toHaveBeenCalledOnce();
  });

  it('explains why the camera could not be opened', async () => {
    const user = userEvent.setup();
    const start: StartCapture = () => Promise.reject(new CameraUnavailableError('No diste permiso para usar la cámara.'));
    render(<CameraPulsePanel start={start} />);
    await user.click(screen.getByRole('button', { name: 'Probar con la cámara' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No diste permiso para usar la cámara.');
    expect(screen.getByRole('button', { name: 'Probar con la cámara' })).toBeEnabled();
  });
});
