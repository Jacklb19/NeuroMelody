import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { DEFAULT_DURATION_MIN } from '../plan/plan';

const linkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: 'var(--espacio-2) var(--espacio-4)',
  borderRadius: 'var(--radio-borde)',
  border: 'var(--borde-grosor) solid var(--color-borde)',
  color: 'var(--color-texto)',
};

/** Punto de entrada (docs/pantallas.md, `/`). */
export function HomePage(): React.JSX.Element {
  usePageTitle('Inicio');
  return (
    <>
      <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-2)' }}>NeuroMelody</h1>
      <p style={{ color: 'var(--color-texto-secundario)', marginBottom: 'var(--espacio-6)' }}>
        Música generativa que acompaña tus señales fisiológicas. Es una herramienta de bienestar,
        no un dispositivo médico.
      </p>
      <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 'var(--espacio-4)' }}>
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
