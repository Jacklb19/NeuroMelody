import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { useWarningsRegistry } from './warningsContext';
import { WARNINGS, CONFIRMATION_TEXT } from './warningsText';

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
  // El estado de la navegación llega sin tipo: se valida en destinoTrasAceptar.
  const state: unknown = useLocation().state;
  const [confirmed, setConfirmed] = useState(false);
  const checkboxId = useId();

  const accept = (): void => {
    registry.accept(new Date());
    void navigate(destinationAfterAccept(state), { replace: true });
  };

  return (
    <>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>Antes de empezar</h1>
      <ul style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', paddingLeft: 'var(--space-6)' }}>
        {WARNINGS.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
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
        onClick={accept}
        disabled={!confirmed}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: 'var(--color-button-background)',
          color: 'var(--color-button-text)',
          border: 'none',
          borderRadius: 'var(--border-radius)',
          fontSize: 'var(--text-base)',
          cursor: confirmed ? 'pointer' : 'not-allowed',
          opacity: confirmed ? 1 : 0.6,
        }}
      >
        Aceptar y continuar
      </button>
    </>
  );
}
