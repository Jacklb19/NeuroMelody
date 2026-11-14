import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { SessionOrb } from './SessionOrb';

const LEVEL_ATTRIBUTE = 'data-level';

function renderOrb(session: AdaptationSession, playing: boolean): HTMLElement {
  const { container } = render(<SessionOrb session={session} connection="connected" progress={0} orbRef={null} playing={playing} />);
  const orb = container.querySelector<HTMLElement>('.session-orb');
  if (orb === null) throw new Error('The session orb was not rendered.');
  return orb;
}

describe('SessionOrb', () => {
  it('shows no step of the music while nothing plays', () => {
    expect(renderOrb(new AdaptationSession(), false)).not.toHaveAttribute(LEVEL_ATTRIBUTE);
  });

  it('carries the step the music is at while it plays (ADR-60)', () => {
    const session = new AdaptationSession({ startLevel: 'target', calmestLevel: 'sleep' });
    expect(renderOrb(session, true)).toHaveAttribute(LEVEL_ATTRIBUTE, 'target');
  });

  it('stays out of the accessibility tree: the text beside it says what it shows', () => {
    expect(renderOrb(new AdaptationSession(), true)).toHaveAttribute('aria-hidden', 'true');
  });
});
