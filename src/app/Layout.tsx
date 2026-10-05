import { NavLink, Outlet } from 'react-router';

const LINKS = [
  { route: '/', text: 'Inicio' },
  { route: '/plan', text: 'Plan' },
  { route: '/session', text: 'Sesión' },
] as const;

/**
 * Shared structure: skip-to-content link, main navigation and the route
 * content. `/diagnostics` is deliberately left out of the navigation: it is
 * a technical tool (docs/pantallas.md).
 */
export function Layout(): React.JSX.Element {
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <nav aria-label="Principal">
          <ul style={{ listStyle: 'none', display: 'flex', gap: 'var(--space-4)' }}>
            {LINKS.map(({ route, text }) => (
              <li key={route}>
                <NavLink
                  to={route}
                  end
                  style={({ isActive }) => ({
                    color: 'var(--color-text)',
                    fontWeight: isActive ? 'var(--font-weight-strong)' : 'var(--font-weight-normal)',
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
