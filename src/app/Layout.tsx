import { Suspense, useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { APP_NAME } from '../config/app';
import { ROUTES } from '../config/routes';
import { useAuth } from '../features/account/authContext';
import { BrandMark } from '../shared/BrandMark';
import { CloseIcon, MenuIcon } from '../shared/icons';
import { QuickPreferences } from './preferences/PreferenceControls';
import { useMessages } from '../i18n/messages';
import { NAVIGATION_ITEMS } from './navigation';
import { PendingScreen } from './PendingScreen';
import { ScreenErrorBoundary } from './ScreenErrorBoundary';
import { DraftRecoveryNotice } from '../features/records/DraftRecoveryNotice';

/** Target of the skip link, so keyboard users can jump past the navigation (WCAG 2.4.1). */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * Shared structure: skip-to-content link, a floating bar with the main
 * navigation and the profile avatar that stays in sight while scrolling, and
 * the route content. Theme and language sit in the bar, or in its menu on a
 * phone. The navigation entries come from `NAVIGATION_ITEMS`. On the public screens (privacy, an unknown address)
 * someone not signed in sees the way in instead of the app's navigation.
 */
export function Layout(): React.JSX.Element {
  const t = useMessages();
  const { state } = useAuth();
  const user = state.kind === 'signed_in' ? state.user : null;
  const { pathname } = useLocation();
  const menuId = useId();
  // On a phone the sections fold into a menu of the same bar. It belongs to the screen it was opened on,
  // so moving to another one closes it; Escape closes it too.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  // A new screen starts at its top: the browser would otherwise keep the scroll of the one before.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') setMenuOpenOn(null); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);
  return (
    <div className="app-shell">
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        {t.app.skipToContent}
      </a>
      <header className={user === null ? 'app-header app-header-public' : 'app-header'}>
        <Link to={user === null ? ROUTES.home : ROUTES.app} className="brand" aria-label={APP_NAME}>
          <BrandMark />
          {APP_NAME}
        </Link>
        {/* On a wide screen these sit in the bar itself; on a phone they are the menu that opens under it. */}
        <div id={menuId} className={menuOpen ? 'header-links is-open' : 'header-links'}>
        {user !== null && <nav aria-label={t.app.mainNavigation}>
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
        </nav>}
          <QuickPreferences />
        </div>
        {user === null ? (
          <Link to={ROUTES.login} className="pill-button pill-button-primary header-sign-in">{t.app.signIn}</Link>
        ) : (
          <NavLink to={ROUTES.account} className="avatar" aria-label={t.app.profile}>
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </NavLink>
        )}
        {user !== null && (
          <button
            type="button"
            className="header-menu-button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t.app.closeMenu : t.app.menu}
            onClick={() => { setMenuOpenOn(menuOpen ? null : pathname); }}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        )}
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="app-main">
        {/* A session left open when the page closed is offered back on whichever screen the app opens (ADR-62). */}
        {user !== null && <DraftRecoveryNotice />}
        {/* A screen that fails keeps the header and the navigation; going to another address tries again. */}
        <ScreenErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PendingScreen />}>
            {/* Keyed by the screen, so each one fades in instead of replacing the last at once. */}
            <div key={pathname} className="route-view">
              <Outlet />
            </div>
          </Suspense>
        </ScreenErrorBoundary>
      </main>
    </div>
  );
}
