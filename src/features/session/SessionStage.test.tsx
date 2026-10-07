import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { AudioEngine } from '../audio/engine/AudioEngine';
import { createFakeAudioEnvironment } from '../../test/fakeAudio';
import { calibrateToUncertain } from '../../test/adaptationReadings';
import { SessionStage } from './SessionStage';

describe('SessionStage', () => {
  it('asks for a signal while no source is connected', () => {
    render(<SessionStage session={new AdaptationSession()} connection="disconnected" />);
    expect(screen.getByRole('heading', { name: 'Conecta una fuente de señal' })).toBeVisible();
    expect(screen.queryByText('La adaptación espera datos de buena calidad.')).not.toBeInTheDocument();
  });

  it('announces the estimated state with its uncalibrated confidence', () => {
    const session = new AdaptationSession();
    render(<SessionStage session={session} connection="connected" />);
    expect(screen.getByRole('status')).toHaveTextContent('Calibrando: no hay datos suficientes');
    expect(screen.getByText('Confianza no calibrada · reglas provisionales')).toBeVisible();

    act(() => { calibrateToUncertain(session); });
    expect(screen.getByRole('status')).toHaveTextContent('Incierta');
    expect(screen.getByRole('heading', { name: 'Tu ritmo se mantiene cerca del inicio' })).toBeVisible();

    act(() => { session.invalidate(); });
    expect(screen.getByText('La adaptación espera datos de buena calidad.')).toBeVisible();
  });

  it('explains the dwell while playing and drops the notice once the step is eligible', async () => {
    const env = createFakeAudioEnvironment();
    const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
    await audio.start();
    const session = new AdaptationSession();
    session.setAudio(audio);
    render(<SessionStage session={session} connection="connected" />);

    act(() => { calibrateToUncertain(session); });
    expect(screen.getByTestId('dwell-notice'))
      .toHaveTextContent('Se conserva el escalón hasta completar su duración mínima de 3 minutos.');

    act(() => { env.context.currentTime = 180.5; session.pulse(); });
    expect(screen.queryByTestId('dwell-notice')).not.toBeInTheDocument();
  });
});
