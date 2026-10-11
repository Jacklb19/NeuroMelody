import { AccountError, type AuthService } from './authService';
import { TotpCodeForm } from './TotpCodeForm';

interface SecondFactorChallengeProps {
  readonly service: AuthService;
  readonly onVerified: () => Promise<void>;
}

/** Second step of the sign-in when the account has an authenticator (aal1 → aal2). */
export function SecondFactorChallenge({ service, onVerified }: SecondFactorChallengeProps): React.JSX.Element {
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
  return <TotpCodeForm onVerify={verify} />;
}
