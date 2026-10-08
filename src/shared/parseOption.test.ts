import { describe, expect, it } from 'vitest';
import { parseOption } from './parseOption';

describe('parseOption', () => {
  it('accepts values from the catalog, comparing them as text', () => {
    expect(parseOption(['rest', 'activation'], 'activation', 'rest')).toBe('activation');
    expect(parseOption([10, 20, 30], '30', 20)).toBe(30);
  });

  it('falls back to the default for anything else', () => {
    expect(parseOption([10, 20, 30], '25', 20)).toBe(20);
    expect(parseOption(['rest'], null, 'rest')).toBe('rest');
  });
});
