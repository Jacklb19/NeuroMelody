import { MIN_PASSWORD_LENGTH } from './config';

/** What the forms check before asking the server; the dictionary words each one. */
export const AUTH_FIELD_ERRORS = [
  'email_required',
  'email_invalid',
  'password_required',
  'password_too_short',
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

/** A password being chosen: long enough and typed the same twice. */
export function validateNewPassword(password: string, confirmation: string): AuthFieldError | null {
  if (password === '') return 'password_required';
  if (password.length < MIN_PASSWORD_LENGTH) return 'password_too_short';
  return password === confirmation ? null : 'passwords_differ';
}
