import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  PASSWORD_CHARACTER_SETS,
  PASSWORD_REQUIREMENTS,
  type PasswordRequirement,
} from './config';

/** What the forms check before asking the server; the dictionary words each one. */
export const AUTH_FIELD_ERRORS = [
  'email_required',
  'email_invalid',
  'password_required',
  'password_too_short',
  'password_too_long',
  'password_needs_characters',
  'passwords_differ',
] as const;
export type AuthFieldError = (typeof AUTH_FIELD_ERRORS)[number];

/** Something, an at sign, a domain with a dot: enough to catch typos; the server has the last word. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): AuthFieldError | null {
  const value = email.trim();
  if (value === '') return 'email_required';
  return EMAIL_SHAPE.test(value) ? null : 'email_invalid';
}

/** Which requirements of a new password `password` already meets. */
export function passwordRequirements(password: string): Readonly<Record<PasswordRequirement, boolean>> {
  // The sets are ASCII, so looking each of their characters up in the password is exact.
  const has = (set: string): boolean => Array.from(set).some((character) => password.includes(character));
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    lowercase: has(PASSWORD_CHARACTER_SETS.lowercase),
    uppercase: has(PASSWORD_CHARACTER_SETS.uppercase),
    digit: has(PASSWORD_CHARACTER_SETS.digit),
    symbol: has(PASSWORD_CHARACTER_SETS.symbol),
  };
}

/**
 * A password being chosen: long enough, short enough to be kept whole, with one character of
 * each kind the server asks for, and typed the same twice.
 */
export function validateNewPassword(password: string, confirmation: string): AuthFieldError | null {
  if (password === '') return 'password_required';
  if (password.length < MIN_PASSWORD_LENGTH) return 'password_too_short';
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return 'password_too_long';
  const met = passwordRequirements(password);
  if (PASSWORD_REQUIREMENTS.some((requirement) => !met[requirement])) return 'password_needs_characters';
  return password === confirmation ? null : 'passwords_differ';
}
