import { createRef, useRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { es } from '../../../i18n/es';
import { BreathingOrb, type OrbHandle } from '../../../shared/BreathingOrb';
import { BreathingGuide } from './BreathingGuide';

const { breathing } = es.session;

function GuideWithOrb(): React.JSX.Element {
  const orbRef = useRef<OrbHandle | null>(null);
  return (
    <>
      <BreathingOrb ref={orbRef} />
      <BreathingGuide startActive engine={null} orbRef={orbRef} />
    </>
  );
}

const nextFrames = (): Promise<void> =>
  new Promise((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }); });

afterEach(() => { vi.unstubAllGlobals(); });

describe('BreathingGuide', () => {
  it('stays off until the person turns it on, and can be turned off again', async () => {
    const user = userEvent.setup();
    render(<BreathingGuide startActive={false} engine={null} orbRef={createRef<OrbHandle>()} />);
    const toggle = screen.getByRole('button', { name: breathing.toggle });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('breath-word')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('breath-word')).toHaveTextContent(breathing.phases.inhale);

    await user.click(toggle);
    expect(screen.queryByTestId('breath-word')).not.toBeInTheDocument();
  });

  it('starts on when the plan asked for it, moves the orb and hands it back when turned off', async () => {
    const user = userEvent.setup();
    const { container } = render(<GuideWithOrb />);
    const orb = container.querySelector('.orb');
    expect(screen.getByRole('button', { name: breathing.toggle })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => { expect(orb).toHaveAttribute('data-guided'); });

    await user.click(screen.getByRole('button', { name: breathing.toggle }));
    expect(orb).not.toHaveAttribute('data-guided');
  });

  it('keeps the orb still with reduced motion and still shows the word', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container } = render(<GuideWithOrb />);
    await act(nextFrames);
    expect(container.querySelector('.orb')).not.toHaveAttribute('data-guided');
    expect(screen.getByTestId('breath-word')).toHaveTextContent(breathing.phases.inhale);
  });
});
