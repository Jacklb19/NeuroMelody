import { NavLink, Outlet } from 'react-router';
import { APP_NAME } from '../config/app';
import { useMessages } from '../i18n/messages';
import { NAVIGATION_ITEMS } from './navigation';

/** Target of the skip link, so keyboard users can jump past the navigation (WCAG 2.4.1). */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * Shared structure: skip-to-content link, main navigation and the route
 * content. The navigation entries come from `NAVIGATION_ITEMS`.
 */
export function Layout(): React.JSX.Element {
  const t = useMessages();
  return (
    <>
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        {t.app.skipToContent}
      </a>
      <header className="app-header">
        <span className="brand" aria-label={APP_NAME}>
          <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M5 20V12M12 25V7M20 22V10M27 18V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {APP_NAME}
        </span>
        <nav aria-label={t.app.mainNavigation}>
          <ul>
            {NAVIGATION_ITEMS.map(({ route, labelKey }) => (
              <li key={route}>
                <NavLink
                  to={route}
                  end
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  {t.app.navigation[labelKey]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </>
  );
}
