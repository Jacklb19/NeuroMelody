import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { QuickPreferences } from '../../app/preferences/PreferenceControls';
import { APP_NAME } from '../../config/app';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { BrandMark } from '../../shared/BrandMark';
import { CloseIcon, MenuIcon } from '../../shared/icons';
import { LANDING_SECTIONS } from './landingCatalog';
import './landing.css';

/**
 * Which public screen the header sits on: the landing, with its sections and
 * both ways in, or a sign-in screen, which offers the other way in.
 */
type PublicHeaderProps =
  | { readonly page: 'landing' }
  | { readonly page: 'access'; readonly offer: 'login' | 'register' };

/**
 * Header of the screens without a session (landing, sign-in, sign-up). On a
 * wide screen it shows everything in one row: brand, sections, theme and
 * language, and the way in. On a phone it becomes a floating pill that
 * follows the scroll, with a menu that holds the sections, theme and language
 * (landing.css).
 */
export function PublicHeader(props: PublicHeaderProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.landing;
  const id = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => { setMenuOpen(false); }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [menuOpen, closeMenu]);

  const sections = (onClick?: () => void): React.JSX.Element => (
    <ul>
      <li><a href={`#${LANDING_SECTIONS.howItWorks}`} onClick={onClick}>{copy.nav.howItWorks}</a></li>
      <li><a href={`#${LANDING_SECTIONS.moments}`} onClick={onClick}>{copy.nav.moments}</a></li>
      <li><a href={`#${LANDING_SECTIONS.privacy}`} onClick={onClick}>{copy.nav.privacy}</a></li>
    </ul>
  );

  return (
    <header className="landing-header night">
      <Link to={ROUTES.home} className="brand landing-brand" aria-label={APP_NAME}>
        <BrandMark />
        {APP_NAME}
      </Link>
      {props.page === 'landing' && <nav aria-label={copy.navigationLabel}>{sections()}</nav>}
      <div className="landing-account">
        <QuickPreferences />
        {props.page === 'landing' ? (
          <>
            <Link to={ROUTES.login} className="landing-signin">{copy.nav.signIn}</Link>
            <Link to={ROUTES.register} className="pill-button pill-button-primary landing-register">{copy.nav.register}</Link>
          </>
        ) : (
          <Link to={props.offer === 'login' ? ROUTES.login : ROUTES.register} className="landing-signin">
            {props.offer === 'login' ? copy.nav.signIn : copy.nav.register}
          </Link>
        )}
        <button
          type="button"
          className="landing-menu-button"
          aria-expanded={menuOpen}
          aria-controls={`${id}-menu`}
          aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.menu}
          onClick={() => { setMenuOpen(!menuOpen); }}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
      <div id={`${id}-menu`} className="landing-menu" hidden={!menuOpen}>
        <nav aria-label={copy.navigationLabel}>
          {props.page === 'landing' ? sections(closeMenu) : (
            <ul><li><Link to={ROUTES.home} onClick={closeMenu}>{t.app.navigation.home}</Link></li></ul>
          )}
        </nav>
        <QuickPreferences />
        {props.page === 'landing' && (
          <Link to={ROUTES.register} className="pill-button pill-button-primary pill-button-block">{copy.nav.register}</Link>
        )}
      </div>
    </header>
  );
}
