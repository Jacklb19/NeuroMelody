import { useMessages } from '../../i18n/messages';

interface SessionStepsProps {
  /** The pulse source is connected. */
  readonly measuring: boolean;
  /** The person said how they feel; optional, so it never blocks the start. */
  readonly rated: boolean;
}

/**
 * What to do before the music starts, in order (ADR-42): measure the pulse,
 * say how you feel, start. Each step shows whether it is done, so the screen
 * reads as a short path instead of a set of unrelated panels.
 */
export function SessionSteps({ measuring, rated }: SessionStepsProps): React.JSX.Element {
  const copy = useMessages().session.steps;
  const steps = [
    { text: copy.measure, done: measuring },
    { text: copy.feeling, done: rated },
    { text: copy.start, done: false },
  ];
  return (
    <ol className="session-steps" aria-label={copy.label}>
      {steps.map((step, index) => (
        <li key={step.text} className={step.done ? 'session-step done' : 'session-step'}>
          <span className="step-mark" aria-hidden="true">{step.done ? copy.doneMark : index + 1}</span>
          <span>{step.text}</span>
          {step.done && <span className="visually-hidden"> ({copy.done})</span>}
        </li>
      ))}
    </ol>
  );
}
