import { act, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AdaptationSession } from './AdaptationSession';
import { MusicalStatePanel } from './MusicalStatePanel';
import { createFakeAudioEnvironment } from '../../test/fakeAudio';
import { AudioEngine } from '../audio/engine/AudioEngine';

it('explains dwell while playing and removes the notice when the step becomes eligible', async () => {
  const env = createFakeAudioEnvironment();
  const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
  await audio.start();
  const session = new AdaptationSession();
  session.setAudio(audio);
  render(<MusicalStatePanel session={session} />);
  act(() => {
    for (let ms = 60_000; ms <= 190_000; ms += 5000) session.receive({ timeMs: ms,
      meanHr: 100, rmssd: 50, sdnn: 50, quality: 'good', nnDurationMs: ms,
      coverageMs: ms, acceptedBeats: 100, discardedBeats: 0 });
  });
  expect(screen.getByTestId('dwell-notice')).toHaveTextContent('Se conserva el escalón hasta completar su duración mínima de 3 minutos.');
  act(() => { env.context.currentTime = 180.5; session.pulse(); });
  expect(screen.queryByTestId('dwell-notice')).not.toBeInTheDocument();
  expect(screen.getByTestId('music-level')).toHaveTextContent('Activación baja (meta)');
});

it('announces accepted states descriptively and exposes scheduled musical parameters', () => {
  const session = new AdaptationSession();
  render(<MusicalStatePanel session={session} />);
  expect(screen.getByRole('status')).toHaveTextContent('Calibrando: no hay datos suficientes');
  expect(screen.getByText('Confianza no calibrada · reglas provisionales')).toBeVisible();
  act(() => {
    for (let ms = 60_000; ms <= 190_000; ms += 5000) session.receive({ timeMs: ms,
      meanHr: 100, rmssd: 50, sdnn: 50, quality: 'good', nnDurationMs: ms,
      coverageMs: ms, acceptedBeats: 100, discardedBeats: 0 });
  });
  expect(screen.getByRole('status')).toHaveTextContent('Incierta');
  expect(screen.getByTestId('music-level')).toHaveTextContent('Intermedio');
  expect(screen.getByText('66 BPM')).toBeVisible();
  act(() => { session.invalidate(); });
  expect(screen.getByText('La adaptación espera datos de buena calidad.')).toBeVisible();
});
