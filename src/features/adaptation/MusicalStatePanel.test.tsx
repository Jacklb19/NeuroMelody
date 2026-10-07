import { act, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { CALIBRATION_LEVEL, LEVELS } from '../audio/engine/levels';
import { AdaptationSession } from './AdaptationSession';
import { MusicalStatePanel } from './MusicalStatePanel';
import { calibrateToUncertain } from '../../test/adaptationReadings';

it('exposes the scheduled musical parameters', () => {
  const session = new AdaptationSession();
  render(<MusicalStatePanel session={session} />);
  expect(screen.getByRole('heading', { name: es.adaptation.musicalState.title })).toBeVisible();
  act(() => { calibrateToUncertain(session); });
  expect(screen.getByTestId('music-level')).toHaveTextContent(es.audio.levels[CALIBRATION_LEVEL]);
  expect(es.audio.levels[CALIBRATION_LEVEL]).toBe('Intermedio');
  const targetTempo = es.common.withUnit(String(LEVELS[CALIBRATION_LEVEL].tempo), es.common.units.tempo);
  expect(targetTempo).toBe('66 BPM');
  expect(screen.getByText(targetTempo)).toBeVisible();
  expect(screen.getByText(es.audio.modes.lydian)).toBeVisible();
  expect(screen.getByText(es.common.noValue)).toBeVisible();
});
