import { describe, it, expect } from 'vitest';
import { fadeStartS, warningInstantS } from './durationWarnings';

describe('avisos de duración', () => {
  it('el primer aviso llega al terminar el plan', () => {
    expect(warningInstantS(20 * 60, 0)).toBe(1200);
    expect(warningInstantS(60 * 60, 0)).toBe(3600);
  });

  it('después avisa cada 60 minutos continuos', () => {
    expect([1, 2, 3].map((i) => warningInstantS(20 * 60, i))).toEqual([3600, 7200, 10800]);
    expect([1, 2].map((i) => warningInstantS(60 * 60, i))).toEqual([7200, 10800]);
  });

  it('el fundido empieza 2 minutos después del aviso', () => {
    expect(fadeStartS(10 * 60, 0)).toBe(720);
    expect(fadeStartS(10 * 60, 1)).toBe(3720);
  });
});
