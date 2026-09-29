import { NavLink, Outlet } from 'react-router';

const LINKS = [
  { route: '/', text: 'Inicio' },
  { route: '/plan', text: 'Plan' },
  { route: '/sesion', text: 'Sesión' },
] as const;

/**
 * Estructura común: enlace para saltar al contenido, navegación principal y
 * contenido de la ruta. `/diagnostico` queda fuera de la navegación a
 * propósito: es una herramienta técnica (docs/pantallas.md).
 */
export function Layout(): React.JSX.Element {
  return (
    <>
      <a href="#contenido" className="saltar-al-contenido">
        Saltar al contenido
      </a>
      <header style={{ marginBottom: 'var(--espacio-8)' }}>
        <nav aria-label="Principal">
          <ul style={{ listStyle: 'none', display: 'flex', gap: 'var(--espacio-4)' }}>
            {LINKS.map(({ route, text }) => (
              <li key={route}>
                <NavLink
                  to={route}
                  end
                  style={({ isActive }) => ({
                    color: 'var(--color-texto)',
                    fontWeight: isActive ? 'var(--peso-destacado)' : 'var(--peso-normal)',
                  })}
                >
                  {text}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
