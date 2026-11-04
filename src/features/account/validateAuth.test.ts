import { describe, expect, it } from 'vitest';
import { MAX_PASSWORD_BYTES } from './config';
import { passwordRequirements, validateNewPassword } from './validateAuth';

const check = (password: string): ReturnType<typeof validateNewPassword> => validateNewPassword(password, password);

describe('new password', () => {
  it('accepts up to the bcrypt limit in UTF-8 bytes, not in characters', () => {
    // Four bytes cover the kinds of character; the rest fill up to the limit.
    const kinds = 'Aa1!';
    expect(check(kinds + 'a'.repeat(MAX_PASSWORD_BYTES - 4))).toBeNull();
    expect(check(kinds + 'a'.repeat(MAX_PASSWORD_BYTES - 3))).toBe('password_too_long');
    // «ñ» takes two bytes: half as many fit.
    expect(check(kinds + 'ñ'.repeat((MAX_PASSWORD_BYTES - 4) / 2))).toBeNull();
    expect(check(kinds + 'ñ'.repeat((MAX_PASSWORD_BYTES - 4) / 2 + 1))).toBe('password_too_long');
  });

  it('asks for a lowercase and an uppercase letter, a number and a symbol', () => {
    expect(check('Contraseña1!')).toBeNull();
    expect(check('contraseña1!')).toBe('password_needs_characters');
    expect(check('CONTRASEÑA1!')).toBe('password_needs_characters');
    expect(check('Contraseña!!')).toBe('password_needs_characters');
    expect(check('Contraseña11')).toBe('password_needs_characters');
    // Accented letters and ñ are not counted as the letters the server asks for.
    expect(passwordRequirements('ÑÁÉ').uppercase).toBe(false);
    expect(passwordRequirements('Aa1?')).toEqual({ length: false, lowercase: true, uppercase: true, digit: true, symbol: true });
    // Length comes first, then the kinds, then the confirmation.
    expect(check('Aa1!')).toBe('password_too_short');
    expect(validateNewPassword('Contraseña1!', 'otra')).toBe('passwords_differ');
  });
});
