import { useEffect, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import './sleepDimmer.css';

/** Time without touching the screen or the keyboard before it is dimmed. */
export const DIM_AFTER_IDLE_MS = 20_000;

/** What counts as the person using the screen. */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown'] as const;

/**
 * Dims the screen of a session meant for falling asleep (ADR-41): after a
 * while without activity a dark layer covers the page, so a phone on the
 * bedside table does not light the room. Any touch or key brings the page
 * back. The fixed Stop button stays above the layer, always reachable.
 */
export function SleepDimmer({ active }: { readonly active: boolean }): React.JSX.Element | null {
  const copy = useMessages().session.dimmer;
  const [dimmed, setDimmed] = useState(false);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let timer = setTimeout(() => { setDimmed(true); }, DIM_AFTER_IDLE_MS);
    const onActivity = (): void => {
      setDimmed(false);
      clearTimeout(timer);
      timer = setTimeout(() => { setDimmed(true); }, DIM_AFTER_IDLE_MS);
    };
    for (const event of ACTIVITY_EVENTS) document.addEventListener(event, onActivity);
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) document.removeEventListener(event, onActivity);
      setDimmed(false);
    };
  }, [active]);

  if (!active || !dimmed) {
    return null;
  }
  // A button, so the keyboard and a screen reader can bring the page back too.
  return (
    <button type="button" className="sleep-dimmer" onClick={() => { setDimmed(false); }}>
      {copy.restore}
    </button>
  );
}
