import { describe, it, expect, vi } from 'vitest';
import { CanalFuente, ErrorFuenteSenal } from './canalFuente';
import type { NotificacionLatido } from './contrato';

function notificacion(tiempoMs: number, frecuenciaCardiaca = 70): NotificacionLatido {
  return { tiempoMs, frecuenciaCardiaca, intervalosRRms: [857], contactoSensor: null };
}

describe('CanalFuente', () => {
  it('empieza desconectado y avisa los cambios de estado una sola vez', () => {
    const canal = new CanalFuente();
    const alCambiarEstado = vi.fn();
    canal.suscribir({ alCambiarEstado });

    expect(canal.estado).toBe('desconectada');
    canal.cambiarEstado('conectando');
    canal.cambiarEstado('conectando');
    canal.cambiarEstado('conectada');

    expect(alCambiarEstado.mock.calls).toEqual([['conectando'], ['conectada']]);
  });

  it('entrega las notificaciones válidas a todos los observadores', () => {
    const canal = new CanalFuente();
    const a = vi.fn();
    const b = vi.fn();
    canal.suscribir({ alNotificar: a });
    canal.suscribir({ alNotificar: b });

    canal.notificar(notificacion(1000));

    expect(a).toHaveBeenCalledWith(notificacion(1000));
    expect(b).toHaveBeenCalledWith(notificacion(1000));
  });

  it('descarta una notificación inválida y emite un error', () => {
    const canal = new CanalFuente();
    const alNotificar = vi.fn();
    const alError = vi.fn();
    canal.suscribir({ alNotificar, alError });

    canal.notificar(notificacion(1000, 300));

    expect(alNotificar).not.toHaveBeenCalled();
    expect(alError).toHaveBeenCalledOnce();
    expect(alError.mock.calls[0]?.[0]).toBeInstanceOf(ErrorFuenteSenal);
  });

  it('rechaza tiempos que retroceden hasta que se reinicia el tiempo', () => {
    const canal = new CanalFuente();
    const alNotificar = vi.fn();
    const alError = vi.fn();
    canal.suscribir({ alNotificar, alError });

    canal.notificar(notificacion(5000));
    canal.notificar(notificacion(1000));
    expect(alError).toHaveBeenCalledOnce();

    canal.reiniciarTiempo();
    canal.notificar(notificacion(1000));
    expect(alNotificar).toHaveBeenCalledTimes(2);
  });

  it('deja de avisar a un observador dado de baja', () => {
    const canal = new CanalFuente();
    const alNotificar = vi.fn();
    const baja = canal.suscribir({ alNotificar });

    baja();
    canal.notificar(notificacion(1000));

    expect(alNotificar).not.toHaveBeenCalled();
  });
});
