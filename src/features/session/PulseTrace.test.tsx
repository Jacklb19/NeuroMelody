import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { es } from '../../i18n/es';
import type { BeatNotification, ConnectionState, SignalSource, SourceObserver } from '../acquisition/contract';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { calibrateToUncertain } from '../../test/adaptationReadings';
import { PulseTrace } from './PulseTrace';

const copy = es.session.pulseTrace;

/** A source the test feeds by hand. */
function manualSource(): { readonly source: SignalSource; readonly send: (n: BeatNotification) => void; readonly setState: (s: ConnectionState) => void } {
  const observers = new Set<SourceObserver>();
  const source: SignalSource = {
    kind: 'ble',
    state: 'connected',
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    subscribe: (observer) => { observers.add(observer); return () => { observers.delete(observer); }; },
  };
  return {
    source,
    send: (n) => { observers.forEach((o) => o.onNotification?.(n)); },
    setState: (s) => { observers.forEach((o) => o.onStateChange?.(s)); },
  };
}

describe('PulseTrace', () => {
  it('draws the line with the first beats and shows the current pulse', () => {
    const { source, send } = manualSource();
    render(<PulseTrace source={source} session={new AdaptationSession()} onShowDetails={() => undefined} />);
    expect(screen.getByText(copy.waiting)).toBeVisible();

    act(() => { send({ timeMs: 2000, heartRate: 62, rrIntervalsMs: [1000, 950], sensorContact: true }); });
    expect(screen.getByRole('img', { name: copy.chartLabel })).toBeVisible();
    expect(screen.getByText('62')).toBeVisible();
  });

  it('tells how far the reference has come and when it is ready', () => {
    const session = new AdaptationSession();
    const { source } = manualSource();
    render(<PulseTrace source={source} session={session} onShowDetails={() => undefined} />);
    expect(screen.getByText(copy.reference('00:00', '03:00', 0, 12))).toBeVisible();
    expect(screen.getByRole('progressbar', { name: copy.progressLabel })).toBeInTheDocument();

    act(() => { calibrateToUncertain(session); });
    expect(screen.getAllByText(copy.referenceReady)[0]).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('starts the line again when the source reconnects', () => {
    const { source, send, setState } = manualSource();
    render(<PulseTrace source={source} session={new AdaptationSession()} onShowDetails={() => undefined} />);
    act(() => { send({ timeMs: 2000, heartRate: 62, rrIntervalsMs: [1000, 950], sensorContact: true }); });
    act(() => { setState('connecting'); });
    expect(screen.getByText(copy.waiting)).toBeVisible();
  });

  it('leads to the full signal and shows nothing without a source', () => {
    const onShowDetails = vi.fn();
    const { source } = manualSource();
    const { rerender } = render(<PulseTrace source={source} session={new AdaptationSession()} onShowDetails={onShowDetails} />);
    fireEvent.click(screen.getByRole('button', { name: copy.showDetails }));
    expect(onShowDetails).toHaveBeenCalledOnce();

    rerender(<PulseTrace source={null} session={new AdaptationSession()} onShowDetails={onShowDetails} />);
    expect(screen.queryByRole('heading', { name: copy.title })).not.toBeInTheDocument();
  });
});
