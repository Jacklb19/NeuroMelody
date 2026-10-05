import { act, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AdaptationSession } from './AdaptationSession';
import { MusicalStatePanel } from './MusicalStatePanel';

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
