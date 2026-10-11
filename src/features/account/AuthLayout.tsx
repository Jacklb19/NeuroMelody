import { Link } from 'react-router';
import { MAIN_CONTENT_ID } from '../../app/Layout';
import { QuickPreferences } from '../../app/preferences/PreferenceControls';
import { APP_NAME } from '../../config/app';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { BrandMark } from '../../shared/BrandMark';
import { BreathingOrb } from '../../shared/BreathingOrb';
import './account.css';

interface AuthLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
  /** Line under the card, usually the way to the sibling screen. */
  readonly footer?: React.ReactNode;
}

/**
 * Frame of the sign-in screens: the orb and the brand on one side, the form
 * on a card on the other. It stands outside the app layout, like the landing.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps): React.JSX.Element {
  const copy = useMessages().account.auth;
  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <Link to={ROUTES.home} className="brand" aria-label={copy.backToHome}>
          <BrandMark />
          {APP_NAME}
        </Link>
        <div className="auth-figure">
          <BreathingOrb className="orb-large" />
          <p className="auth-tagline">{copy.tagline}</p>
        </div>
      </aside>
      <main id={MAIN_CONTENT_ID} className="auth-main">
        <div className="auth-preferences"><QuickPreferences /></div>
        <div className="auth-card paper">
          <Link to={ROUTES.home} className="brand auth-brand-compact" aria-label={copy.backToHome}>
            <BrandMark />
            {APP_NAME}
          </Link>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
        {footer !== undefined && <p className="auth-footer">{footer}</p>}
      </main>
    </div>
  );
}
