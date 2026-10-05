import { describe, it, expect } from 'vitest';
import { quantizeRrMs, msFromRrUnits } from './rrUnits';

describe('BLE RR units (1/1024 s)', () => {
  it('converts units to milliseconds', () => {
    expect(msFromRrUnits(1024)).toBe(1000);
    expect(msFromRrUnits(512)).toBe(500);
    expect(msFromRrUnits(1)).toBe(0.9765625);
  });

  it('quantizes to the nearest multiple of 1/1024 s', () => {
    expect(quantizeRrMs(1000)).toBe(1000);
    // 800 ms = 819.2 units → 819 units = 799.8046875 ms
    expect(quantizeRrMs(800)).toBe(799.8046875);
  });
});
