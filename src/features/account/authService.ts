/**
 * What the account screens need from the identity provider (ADR-10, ADR-18).
 * Supabase Auth implements it in `supabaseAuthService.ts`; tests use a fake.
 * Every failure is an `AccountError` with a code the interface words.
 */

/** Why an account action failed; the dictionary has a sentence for each. */
export const ACCOUNT_ERROR_CODES = [
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'weak_password',
  'same_password',
  'rate_limited',
  'invalid_code',
  'code_expired',
  'too_many_factors',
  'session_expired',
  'network',
  'unknown',
] as const;
export type AccountErrorCode = (typeof ACCOUNT_ERROR_CODES)[number];

export class AccountError extends Error {
  readonly code: AccountErrorCode;

  constructor(code: AccountErrorCode) {
    super(`Account action failed: ${code}`);
    this.name = 'AccountError';
    this.code = code;
  }
}

/** Authenticator assurance level: `aal2` once the second factor was verified in this session. */
export type AssuranceLevel = 'aal1' | 'aal2';

export interface Assurance {
  readonly current: AssuranceLevel;
  /** `aal2` when the account has a verified second factor, so the session should reach it. */
  readonly next: AssuranceLevel;
}

export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

/** A verified authenticator app on one device. */
export interface TotpFactor {
  readonly id: string;
  readonly name: string | null;
  readonly createdAt: string;
}

/** What the person needs to add an authenticator: a QR code (as an image URL) and the same secret in text. */
export interface TotpEnrollment {
  readonly factorId: string;
  readonly qrCodeUrl: string;
  readonly secret: string;
}

export type AuthEvent = 'signed_in' | 'signed_out' | 'password_recovery' | 'updated';

export interface AuthService {
  currentUser(): Promise<AuthUser | null>;
  /** Calls back on every change of session; returns the unsubscribe function. */
  onChange(listener: (event: AuthEvent) => void): () => void;
  /** Creates the account; the person confirms it from the link sent by email. */
  signUp(email: string, password: string, confirmUrl: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Sends a link that opens `resetUrl` in recovery mode. */
  requestPasswordReset(email: string, resetUrl: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  assurance(): Promise<Assurance>;
  listTotpFactors(): Promise<TotpFactor[]>;
  /** Starts adding an authenticator; it only counts once `verifyTotp` succeeds. */
  enrollTotp(name: string): Promise<TotpEnrollment>;
  /** Verifies a code: finishes an enrollment or raises the session to `aal2`. */
  verifyTotp(factorId: string, code: string): Promise<void>;
  removeTotp(factorId: string): Promise<void>;
}
