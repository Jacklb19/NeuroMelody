import { describe, it, expect } from 'vitest';
import type { BeatNotification } from '../acquisition/contract';
import { validateNotification } from './validateNotification';

const base: BeatNotification = {
  timeMs: 1000,
  heartRate: 70,
  rrIntervalsMs: [857],
  sensorContact: true,
};

describe('validarNotificacion', () => {
  it('acepta una notificación bien formada', () => {
    expect(validateNotification(base, 0)).toEqual({ valid: true });
  });

  it('acepta una notificación sin intervalos RR', () => {
    expect(validateNotification({ ...base, rrIntervalsMs: [] }, 0).valid).toBe(
      true,
    );
  });

  it('acepta los límites exactos de frecuencia cardíaca', () => {
    expect(validateNotification({ ...base, heartRate: 20 }, 0).valid).toBe(true);
    expect(validateNotification({ ...base, heartRate: 250 }, 0).valid).toBe(true);
  });

  it.each([19, 251, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza la frecuencia cardíaca %s',
    (heartRate) => {
      expect(
        validateNotification({ ...base, heartRate }, 0).valid,
      ).toBe(false);
    },
  );

  it.each([0, -5, Number.NaN])('rechaza el intervalo RR %s', (rr) => {
    expect(
      validateNotification({ ...base, rrIntervalsMs: [800, rr] }, 0).valid,
    ).toBe(false);
  });

  it('rechaza tiempos negativos o no finitos', () => {
    expect(validateNotification({ ...base, timeMs: -1 }, 0).valid).toBe(false);
    expect(validateNotification({ ...base, timeMs: Number.NaN }, 0).valid).toBe(false);
  });

  it('rechaza que el tiempo retroceda y acepta que se repita', () => {
    expect(validateNotification(base, 2000)).toEqual({
      valid: false,
      reason: 'El tiempo de señal retrocedió.',
    });
    expect(validateNotification(base, 1000).valid).toBe(true);
  });
});
