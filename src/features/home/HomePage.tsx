import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { DEFAULT_DURATION_MIN } from '../plan/plan';

const linkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--border-radius)',
  border: 'var(--border-width) solid var(--color-border)',
  color: 'var(--color-text)',
};

/** Punto de entrada (docs/pantallas.md, `/`). */
export function HomePage(): React.JSX.Element {
  usePageTitle('Inicio');
  return (
    <>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>NeuroMelody</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
        Música generativa que acompaña tus señales fisiológicas. Es una herramienta de bienestar,
        no un dispositivo médico.
      </p>
      <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <li>
          <Link to="/plan" style={linkStyle}>
            Preparar una sesión
          </Link>
        </li>
        <li>
          <Link to="/sesion" style={linkStyle}>
            Empezar con el plan por defecto ({DEFAULT_DURATION_MIN} minutos)
          </Link>
        </li>
      </ul>
    </>
  );
}
