import { describe, it, expect } from 'vitest';
import type { NotificacionLatido } from '../acquisition/contract';
import { validarNotificacion } from './validateNotification';

const base: NotificacionLatido = {
  tiempoMs: 1000,
  frecuenciaCardiaca: 70,
  intervalosRRms: [857],
  contactoSensor: true,
};

describe('validarNotificacion', () => {
  it('acepta una notificación bien formada', () => {
    expect(validarNotificacion(base, 0)).toEqual({ valida: true });
  });

  it('acepta una notificación sin intervalos RR', () => {
    expect(validarNotificacion({ ...base, intervalosRRms: [] }, 0).valida).toBe(
      true,
    );
  });

  it('acepta los límites exactos de frecuencia cardíaca', () => {
    expect(validarNotificacion({ ...base, frecuenciaCardiaca: 20 }, 0).valida).toBe(true);
    expect(validarNotificacion({ ...base, frecuenciaCardiaca: 250 }, 0).valida).toBe(true);
  });

  it.each([19, 251, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza la frecuencia cardíaca %s',
    (frecuenciaCardiaca) => {
      expect(
        validarNotificacion({ ...base, frecuenciaCardiaca }, 0).valida,
      ).toBe(false);
    },
  );

  it.each([0, -5, Number.NaN])('rechaza el intervalo RR %s', (rr) => {
    expect(
      validarNotificacion({ ...base, intervalosRRms: [800, rr] }, 0).valida,
    ).toBe(false);
  });

  it('rechaza tiempos negativos o no finitos', () => {
    expect(validarNotificacion({ ...base, tiempoMs: -1 }, 0).valida).toBe(false);
    expect(validarNotificacion({ ...base, tiempoMs: Number.NaN }, 0).valida).toBe(false);
  });

  it('rechaza que el tiempo retroceda y acepta que se repita', () => {
    expect(validarNotificacion(base, 2000)).toEqual({
      valida: false,
      motivo: 'El tiempo de señal retrocedió.',
    });
    expect(validarNotificacion(base, 1000).valida).toBe(true);
  });
});
