import { useMessages } from '../../i18n/messages';
import { SLIDE_IDS, type SlideId } from './sessionSlides';

interface SessionStepperProps {
  readonly current: SlideId;
  /** Slides already completed: they show a check. */
  readonly done: ReadonlySet<SlideId>;
  /** Slides that can be opened now; the others wait for an earlier step. */
  readonly reachable: ReadonlySet<SlideId>;
  readonly onSelect: (slide: SlideId) => void;
}

/**
 * Where the person is in the session and the way back to an earlier slide
 * (ADR-47), for example to change the sensor while the music plays.
 */
export function SessionStepper({ current, done, reachable, onSelect }: SessionStepperProps): React.JSX.Element {
  const copy = useMessages().session.slides;
  const names: Readonly<Record<SlideId, string>> = copy.names;
  return (
    <nav className="session-stepper" aria-label={copy.label}>
      <ol>
        {SLIDE_IDS.map((id, index) => (
          <li key={id}>
            <button
              type="button"
              className="stepper-step"
              aria-current={id === current ? 'step' : undefined}
              disabled={!reachable.has(id)}
              onClick={() => { onSelect(id); }}
            >
              <span className="step-mark" aria-hidden="true">{done.has(id) && id !== current ? copy.doneMark : index + 1}</span>
              <span>{names[id]}</span>
              {done.has(id) && id !== current && <span className="visually-hidden"> ({copy.done})</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
