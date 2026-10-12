import { useState, type RefObject } from 'react';
import { useMessages } from '../../../i18n/messages';
import type { OrbHandle } from '../../../shared/BreathingOrb';
import { WindIcon } from '../../../shared/icons';
import type { AudioEngine } from '../../audio/engine/AudioEngine';
import type { BreathPhase } from './breathingPattern';
import { useBreathingGuide } from './useBreathingGuide';

interface BreathingGuideProps {
  /** Whether the guide starts on: the person chose the breathing goal in the plan. */
  readonly startActive: boolean;
  /** The engine while the music plays; the guide follows its tempo. */
  readonly engine: AudioEngine | null;
  /** The orb that grows and settles with the breath. */
  readonly orbRef: RefObject<OrbHandle | null>;
}

/**
 * Optional guided breathing under the orb (ADR-33): a switch the person
 * turns on and off, and the word that says when to breathe in and out.
 * The word is announced on each change because it is the guide itself for
 * someone who cannot see the orb. It describes a pace and promises nothing.
 */
export function BreathingGuide({ startActive, engine, orbRef }: BreathingGuideProps): React.JSX.Element {
  const { breathing } = useMessages().session;
  const [active, setActive] = useState(startActive);
  const phase = useBreathingGuide(active, engine, orbRef);
  // Typed by id, so a phase without a word is a compile error.
  const phases: Readonly<Record<BreathPhase, string>> = breathing.phases;

  return (
    <div className="breathing-guide">
      {active && (
        <div className="breath-cue">
          <p className="breath-word" aria-live="polite" data-testid="breath-word">{phases[phase]}</p>
          <p className="breath-hint">{breathing.hint}</p>
        </div>
      )}
      <button
        type="button"
        className="pill-button pill-button-ghost breathing-toggle"
        aria-pressed={active}
        onClick={() => { setActive((current) => !current); }}
      >
        <WindIcon /> {breathing.toggle}
      </button>
    </div>
  );
}
