import { act, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AdaptationSession } from './AdaptationSession';
import { MusicalStatePanel } from './MusicalStatePanel';
import { calibrateToUncertain } from '../../test/adaptationReadings';

it('exposes the scheduled musical parameters', () => {
  const session = new AdaptationSession();
  render(<MusicalStatePanel session={session} />);
  expect(screen.getByRole('heading', { name: 'Parámetros musicales' })).toBeVisible();
  act(() => { calibrateToUncertain(session); });
  expect(screen.getByTestId('music-level')).toHaveTextContent('Intermedio');
  expect(screen.getByText('66 BPM')).toBeVisible();
});
