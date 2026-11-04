import { useState } from 'react';
import { useLocation } from 'react-router';
import { absoluteUrl, ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { GoogleIcon } from '../../shared/icons';
import { accessReturnPath, rememberAccessReturn } from './accessReturn';
import type { AuthService } from './authService';
import { FormError } from './FormError';
import { useAccountAction } from './useAccountAction';

/**
 * "Continue with Google". Before leaving for Google it asks the project
 * whether that sign-in is enabled, so a project without it explains itself
 * instead of landing on an error page. Google returns to the app's start,
 * so the screen to come back to is kept for that return.
 */
export function GoogleButton({ service }: { readonly service: AuthService }): React.JSX.Element {
  const copy = useMessages().account.auth;
  const [unavailable, setUnavailable] = useState(false);
  const { pending, error, run } = useAccountAction();
  const returnTo = accessReturnPath(useLocation().state);

  const start = (): void => {
    void run(async () => {
      if (!(await service.googleAvailable())) {
        setUnavailable(true);
        return;
      }
      rememberAccessReturn(returnTo);
      await service.signInWithGoogle(absoluteUrl(window.location.origin, ROUTES.app));
    });
  };

  return (
    <>
      <button type="button" className="pill-button pill-button-ghost pill-button-block google-button" disabled={pending} onClick={start}>
        <GoogleIcon /> {copy.google}
      </button>
      {unavailable && <p role="status" className="field-hint">{copy.googleUnavailable}</p>}
      <FormError code={error} />
    </>
  );
}
