/** Account settings the interface checks before asking the server (ADR-25). */

/** Shortest password the forms accept; Supabase applies its own rules too. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Kinds of character a new password needs, at least one of each (ADR-55). The sets are the ones
 * Supabase Auth checks with "Lowercase, uppercase letters, digits and symbols". Accented letters
 * and ñ count for none.
 */
export const PASSWORD_CHARACTER_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digit: '0123456789',
  symbol: '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~',
} as const;
export type PasswordCharacterKind = keyof typeof PASSWORD_CHARACTER_SETS;

/** Requirements of a new password, in the order its list shows them. */
export const PASSWORD_REQUIREMENTS = ['length', 'lowercase', 'uppercase', 'digit', 'symbol'] as const;
export type PasswordRequirement = (typeof PASSWORD_REQUIREMENTS)[number];

/** Longest password in UTF-8 bytes: bcrypt, behind Supabase Auth, ignores whatever comes after. */
export const MAX_PASSWORD_BYTES = 72;

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
