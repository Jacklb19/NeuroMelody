import { describe, it, expect } from 'vitest';
import { ContextoDibujoFalso } from '../../../test/contextoDibujoFalso';
import type { PaletaGrafica } from '../dibujo/paleta';
import { crearManejadorHiloSenal } from './manejadorHilo';
import type { LienzoHilo, MensajeDesdeHilo } from './protocolo';

const PALETA: PaletaGrafica = {
  linea: 'rgb(1, 1, 1)',
  rejilla: 'rgb(2, 2, 2)',
  texto: 'rgb(3, 3, 3)',
  descartado: 'rgb(4, 4, 4)',
  bajaCalidadFondo: 'rgb(5, 5, 5)',
  bajaCalidadRayado: 'rgb(6, 6, 6)',
  fuente: '14px sans-serif',
};

function crearEscena(contexto: ContextoDibujoFalso | null = new ContextoDibujoFalso()) {
  const recibidos: MensajeDesdeHilo[] = [];
  const manejar = crearManejadorHiloSenal((m) => recibidos.push(m));
  const lienzo: LienzoHilo = { width: 300, height: 150, getContext: () => contexto };
  return { recibidos, manejar, lienzo, contexto };
}

const notificacion = (tiempoMs: number) => ({
  tipo: 'notificacion',
  notificacion: { tiempoMs, frecuenciaCardiaca: 60, intervalosRRms: [1000], contactoSensor: true },
});

describe('crearManejadorHiloSenal', () => {
  it('ajusta el lienzo a la densidad de pantalla y dibuja al iniciarlo', () => {
    const { manejar, lienzo, contexto } = crearEscena();
    manejar({
      tipo: 'iniciar-lienzo',
      lienzo,
      paleta: PALETA,
      dimensiones: { anchoCss: 500, altoCss: 200, escala: 1.5 },
    });
    expect(lienzo.width).toBe(750);
    expect(lienzo.height).toBe(300);
    expect(contexto?.contar('clearRect')).toBe(1);
  });

  it('redibuja con cada notificación y al redimensionar', () => {
    const { manejar, lienzo, contexto } = crearEscena();
    manejar({ tipo: 'iniciar-lienzo', lienzo, paleta: PALETA, dimensiones: { anchoCss: 500, altoCss: 200, escala: 1 } });
    manejar(notificacion(1000));
    manejar(notificacion(2000));
    manejar({ tipo: 'redimensionar', dimensiones: { anchoCss: 400, altoCss: 200, escala: 2 } });

    expect(contexto?.contar('clearRect')).toBe(4);
    expect(lienzo.width).toBe(800);
  });

  it('procesa las notificaciones aunque no haya lienzo', () => {
    const { manejar, recibidos } = crearEscena();
    manejar({ tipo: 'redimensionar', dimensiones: { anchoCss: 400, altoCss: 200, escala: 1 } });
    for (let t = 1000; t <= 5000; t += 1000) {
      manejar(notificacion(t));
    }
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0]?.tipo).toBe('indices');
  });

  it('avisa si el lienzo no da un contexto 2D', () => {
    const { manejar, lienzo, recibidos } = crearEscena(null);
    manejar({ tipo: 'iniciar-lienzo', lienzo, paleta: PALETA, dimensiones: { anchoCss: 1, altoCss: 1, escala: 1 } });
    expect(recibidos).toEqual([{ tipo: 'error', mensaje: 'No se pudo obtener el contexto 2D del lienzo.' }]);
  });

  it('rechaza un lienzo con una paleta incompleta', () => {
    const { manejar, lienzo, recibidos, contexto } = crearEscena();
    manejar({
      tipo: 'iniciar-lienzo',
      lienzo,
      paleta: { ...PALETA, descartado: '' },
      dimensiones: { anchoCss: 1, altoCss: 1, escala: 1 },
    });
    expect(recibidos[0]?.tipo).toBe('error');
    expect(contexto?.operaciones).toEqual([]);
  });
});
