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
      <header className="app-header">
        <span className="brand" aria-label="NeuroMelody">
          <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M5 20V12M12 25V7M20 22V10M27 18V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          NeuroMelody
        </span>
        <nav aria-label="Principal">
          <ul>
            {LINKS.map(({ route, text }) => (
              <li key={route}>
                <NavLink
                  to={route}
                  end
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  {text}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="contenido" tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </>
  );
}
