/** Account settings the interface checks before asking the server (ADR-25). */

/** Shortest password the forms accept; Supabase applies its own rules too. */
export const MIN_PASSWORD_LENGTH = 8;

/** Digits of a TOTP code (RFC 6238 default, what authenticator apps show). */
export const TOTP_CODE_LENGTH = 6;

/**
 * Longest the app waits to learn who is signed in before showing itself, when this browser
 * seems to keep a session. Past it the app opens anyway: it must never stay on a blank screen.
 */
export const SESSION_CHECK_TIMEOUT_MS = 5000;

/** Views of the signed-out account screen, in tab order. */
export const AUTH_FORM_IDS = ['signIn', 'signUp', 'reset'] as const;
export type AuthFormId = (typeof AUTH_FORM_IDS)[number];
export const DEFAULT_AUTH_FORM: AuthFormId = 'signIn';

/** Value of `QUERY_PARAMS.accountMode` in the recovery link, so the page opens on the new-password form. */
export const RECOVERY_MODE = 'recovery';

/** Whether `code` has exactly the digits of a TOTP code. */
export function isTotpCode(code: string): boolean {
  return new RegExp(`^\\d{${String(TOTP_CODE_LENGTH)}}$`).test(code);
}
