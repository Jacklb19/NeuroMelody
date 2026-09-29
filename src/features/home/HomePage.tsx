import { Link } from 'react-router';
import { useTituloPagina } from '../../app/usePageTitle';
import { DURACION_POR_OMISION_MIN } from '../plan/plan';

const estiloEnlace: React.CSSProperties = {
  display: 'inline-block',
  padding: 'var(--espacio-2) var(--espacio-4)',
  borderRadius: 'var(--radio-borde)',
  border: 'var(--borde-grosor) solid var(--color-borde)',
  color: 'var(--color-texto)',
};

/** Punto de entrada (docs/pantallas.md, `/`). */
export function PaginaInicio(): React.JSX.Element {
  useTituloPagina('Inicio');
  return (
    <>
      <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-2)' }}>NeuroMelody</h1>
      <p style={{ color: 'var(--color-texto-secundario)', marginBottom: 'var(--espacio-6)' }}>
        Música generativa que acompaña tus señales fisiológicas. Es una herramienta de bienestar,
        no un dispositivo médico.
      </p>
      <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 'var(--espacio-4)' }}>
        <li>
          <Link to="/plan" style={estiloEnlace}>
            Preparar una sesión
          </Link>
        </li>
        <li>
          <Link to="/sesion" style={estiloEnlace}>
            Empezar con el plan por defecto ({DURACION_POR_OMISION_MIN} minutos)
          </Link>
        </li>
      </ul>
    </>
  );
}
