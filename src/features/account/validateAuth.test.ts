import { describe, expect, it } from 'vitest';
import { MAX_PASSWORD_BYTES } from './config';
import { validateNewPassword } from './validateAuth';

const check = (password: string): ReturnType<typeof validateNewPassword> => validateNewPassword(password, password);

describe('new password', () => {
  it('accepts up to the bcrypt limit in UTF-8 bytes, not in characters', () => {
    expect(check('a'.repeat(MAX_PASSWORD_BYTES))).toBeNull();
    expect(check('a'.repeat(MAX_PASSWORD_BYTES + 1))).toBe('password_too_long');
    // «ñ» takes two bytes: half as many fit.
    expect(check('ñ'.repeat(MAX_PASSWORD_BYTES / 2))).toBeNull();
    expect(check('ñ'.repeat(MAX_PASSWORD_BYTES / 2 + 1))).toBe('password_too_long');
  });
});
