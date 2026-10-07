import { describe, expect, it } from 'vitest';
import { isUuid, uuidv7 } from './uuidv7';

const zeros = (length: number): Uint8Array => new Uint8Array(length);

describe('uuidv7', () => {
  it('encodes the timestamp, version and variant from RFC 9562', () => {
    // Test vector from RFC 9562, appendix A.6: 2022-02-22 19:22:22 UTC.
    const id = uuidv7(0x017f22e279b0, zeros);
    expect(id).toBe('017f22e2-79b0-7000-8000-000000000000');
    expect(isUuid(id)).toBe(true);
  });

  it('sorts ids by creation time', () => {
    const earlier = uuidv7(1_700_000_000_000);
    const later = uuidv7(1_700_000_000_001);
    expect([later, earlier].sort()).toEqual([earlier, later]);
  });

  it('rejects text that is not a UUID', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
