import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { useWarningsRegistry } from './warningsContext';
import { WARNINGS, CONFIRMATION_TEXT } from './warningsText';
import { PageHeading } from '../../shared/PageHeading';

function destinationAfterAccept(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string') {
    return state.from;
  }
  return '/session';
}

export function WarningsPage(): React.JSX.Element {
  usePageTitle('Antes de empezar');
  const registry = useWarningsRegistry();
  const navigate = useNavigate();
  // Navigation state is untyped and validated before choosing the destination.
  const state: unknown = useLocation().state;
  const [confirmed, setConfirmed] = useState(false);
  const checkboxId = useId();

  const accept = (): void => {
    registry.accept(new Date());
    void navigate(destinationAfterAccept(state), { replace: true });
  };

  return (
    <div className="reading-page warnings-page">
      <PageHeading eyebrow="Una escucha consciente" title="Antes de empezar" />
      <ul className="warnings-list">
        {WARNINGS.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <div className="confirmation-control">
        <input
          id={checkboxId}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => {
            setConfirmed(event.target.checked);
          }}
        />
        <label htmlFor={checkboxId}>{CONFIRMATION_TEXT}</label>
      </div>
      <button
        type="button"
        className="button button-primary"
        onClick={accept}
        disabled={!confirmed}
      >
        Aceptar y continuar
      </button>
    </div>
  );
}
