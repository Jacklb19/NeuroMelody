import { describe, expect, it } from 'vitest';
import { formattersFor } from './formatters';

describe('formattersFor', () => {
  const format = formattersFor('es');

  it('uses Colombian Spanish separators', () => {
    expect(format.decimal(0.4, 2)).toBe('0,40');
    expect(format.integer(1234.6)).toBe('1.235');
  });

  it('reuses the same formatters for a locale', () => {
    expect(formattersFor('es')).toBe(format);
  });
});
