import { Link, NavLink, Outlet } from 'react-router';
import { APP_NAME } from '../config/app';
import { ROUTES } from '../config/routes';
import { useAuth } from '../features/account/authContext';
import { BrandMark } from '../shared/BrandMark';
import { UserIcon } from '../shared/icons';
import { useMessages } from '../i18n/messages';
import { NAVIGATION_ITEMS } from './navigation';
import { QuickPreferences } from './preferences/PreferenceControls';

/** Target of the skip link, so keyboard users can jump past the navigation (WCAG 2.4.1). */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * Shared structure: skip-to-content link, main navigation, the profile
 * avatar and the route content. The navigation entries come from
 * `NAVIGATION_ITEMS`.
 */
export function Layout(): React.JSX.Element {
  const t = useMessages();
  const { state } = useAuth();
  const user = state.kind === 'signed_in' || state.kind === 'recovery' ? state.user : null;
  return (
    <div className="app-shell">
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        {t.app.skipToContent}
      </a>
      <header className="app-header">
        <Link to={ROUTES.app} className="brand" aria-label={APP_NAME}>
          <BrandMark />
          {APP_NAME}
        </Link>
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
        <QuickPreferences />
        <NavLink to={ROUTES.account} className="avatar" aria-label={t.app.profile}>
          {user === null ? <UserIcon /> : (user.name ?? user.email).charAt(0).toUpperCase()}
        </NavLink>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
