import { render, screen } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeOpenEngines, trackOpenEngine, untrackOpenEngine } from '../features/audio/engine/openEngines';
import { es } from '../i18n/es';
import { ScreenErrorBoundary } from './ScreenErrorBoundary';

function Broken(): React.JSX.Element {
  throw new Error('render failed');
}

describe('ScreenErrorBoundary', () => {
  beforeEach(() => {
    // React reports caught render errors on the console; they are expected here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await closeOpenEngines();
  });

  it('shows its children while nothing fails', () => {
    render(<ScreenErrorBoundary><p>screen</p></ScreenErrorBoundary>);
    expect(screen.getByText('screen')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('replaces a screen that throws with the notice and closes the playing engine', async () => {
    const engine = { close: vi.fn(() => Promise.resolve()) };
    trackOpenEngine(engine);
    render(<ScreenErrorBoundary><Broken /></ScreenErrorBoundary>);
    expect(await screen.findByRole('alert')).toHaveTextContent(es.app.screenFailure.title);
    expect(screen.getByRole('button', { name: es.app.screenFailure.reload })).toBeInTheDocument();
    expect(engine.close).toHaveBeenCalledTimes(1);
  });

  it('does not close an engine that was already closed', async () => {
    const engine = { close: vi.fn(() => Promise.resolve()) };
    trackOpenEngine(engine);
    untrackOpenEngine(engine);
    render(<ScreenErrorBoundary><Broken /></ScreenErrorBoundary>);
    await screen.findByRole('alert');
    expect(engine.close).not.toHaveBeenCalled();
  });

  it('catches a screen file that does not arrive', async () => {
    const engine = { close: vi.fn(() => Promise.resolve()) };
    trackOpenEngine(engine);
    const Missing = lazy(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
    render(
      <ScreenErrorBoundary>
        <Suspense fallback={null}><Missing /></Suspense>
      </ScreenErrorBoundary>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(es.app.screenFailure.title);
    expect(engine.close).toHaveBeenCalledTimes(1);
  });

  it('keeps closing the other engines when one fails to close', async () => {
    const failing = { close: vi.fn(() => Promise.reject(new Error('already gone'))) };
    const healthy = { close: vi.fn(() => Promise.resolve()) };
    trackOpenEngine(failing);
    trackOpenEngine(healthy);
    await closeOpenEngines();
    expect(healthy.close).toHaveBeenCalledTimes(1);
  });

  it('tries again when the address changes', async () => {
    const { rerender } = render(<ScreenErrorBoundary resetKey="/a"><Broken /></ScreenErrorBoundary>);
    await screen.findByRole('alert');
    rerender(<ScreenErrorBoundary resetKey="/a"><p>other screen</p></ScreenErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<ScreenErrorBoundary resetKey="/b"><p>other screen</p></ScreenErrorBoundary>);
    expect(screen.getByText('other screen')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
