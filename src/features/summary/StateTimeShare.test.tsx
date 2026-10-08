import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { SIGNAL_PHASE_IDS } from '../records/summarizeSession';
import { PHASE_DISPLAY_ORDER } from './phaseDisplayOrder';
import { StateTimeShare } from './StateTimeShare';

const { stateShare } = es.summary;
const minutes = (value: number): string => es.common.withUnit(String(value), es.common.units.minutes);

describe('StateTimeShare', () => {
  it('shows every phase exactly once', () => {
    expect([...PHASE_DISPLAY_ORDER].sort()).toEqual([...SIGNAL_PHASE_IDS].sort());
  });

  it('lists the time of each phase in display order', () => {
    render(<StateTimeShare secondsByState={{ calibrating: 180, high: 0, uncertain: 20, low: 600 }} />);
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      `${stateShare.phases.calibrating}${minutes(3)}`,
      `${stateShare.phases.high}${minutes(0)}`,
      `${stateShare.phases.uncertain}${es.records.lessThan(minutes(1))}`,
      `${stateShare.phases.low}${minutes(10)}`,
    ]);
    expect(screen.getByText(stateShare.footnote)).toBeVisible();
  });

  it('says so when no phase has any signal time', () => {
    render(<StateTimeShare secondsByState={{ calibrating: 0, high: 0, uncertain: 0, low: 0 }} />);
    expect(screen.getByText(stateShare.empty)).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
