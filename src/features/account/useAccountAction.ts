import { useCallback, useState } from 'react';
import { AccountError, type AccountErrorCode } from './authService';

interface AccountAction {
  readonly pending: boolean;
  readonly error: AccountErrorCode | null;
  /** Runs `action`, tracking its progress and turning a failure into a code; resolves to whether it succeeded. */
  readonly run: (action: () => Promise<void>) => Promise<boolean>;
  readonly clearError: () => void;
}

/** Shared progress and error handling of the account forms. */
export function useAccountAction(): AccountAction {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AccountErrorCode | null>(null);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(cause instanceof AccountError ? cause.code : 'unknown');
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const clearError = useCallback(() => { setError(null); }, []);
  return { pending, error, run, clearError };
}
