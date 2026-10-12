import { useMessages } from '../../i18n/messages';
import { AccountError, type AuthService } from './authService';
import { TotpCodeForm } from './TotpCodeForm';

interface SecondFactorChallengeProps {
  readonly service: AuthService;
  readonly onVerified: () => Promise<void>;
  /** Called once the person chose to sign out instead of entering the code. */
  readonly onSignedOut: () => Promise<void>;
}

/**
 * Second step of the sign-in when the account has an authenticator (aal1 → aal2).
 * Whoever does not have the code at hand can sign out and keep using the app
 * without an account, instead of being stuck on this screen.
 */
export function SecondFactorChallenge({ service, onVerified, onSignedOut }: SecondFactorChallengeProps): React.JSX.Element {
  const copy = useMessages().account.totp;
  const verify = async (code: string): Promise<void> => {
    // Each device has its own secret, so the code is tried against every one until one accepts it.
    const factors = await service.listTotpFactors();
    let failure: Error = new AccountError('invalid_code');
    for (const factor of factors) {
      try {
        await service.verifyTotp(factor.id, code);
        await onVerified();
        return;
      } catch (error) {
        failure = error instanceof Error ? error : new AccountError('unknown');
      }
    }
    throw failure;
  };
  return (
    <>
      <TotpCodeForm onVerify={verify} />
      <button type="button" className="text-button" onClick={() => { void service.signOut().then(onSignedOut); }}>
        {copy.signOutInstead}
      </button>
    </>
  );
}
