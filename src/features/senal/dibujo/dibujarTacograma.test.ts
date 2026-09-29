import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ContextoDibujoFalso } from '../../../test/contextoDibujoFalso';
import type { InstantaneaVentana } from '../procesamiento/ProcesadorSenal';
import type { LatidoClasificado } from '../procesamiento/tipos';
import { dibujarTacograma, type DimensionesLienzo } from './dibujarTacograma';
import type { PaletaGrafica } from './paleta';

// Valores arbitrarios y distinguibles: la prueba comprueba que se usan tal cual.
const PALETA: PaletaGrafica = {
  linea: 'rgb(1, 1, 1)',
  rejilla: 'rgb(2, 2, 2)',
  texto: 'rgb(3, 3, 3)',
  descartado: 'rgb(4, 4, 4)',
  bajaCalidadFondo: 'rgb(5, 5, 5)',
  bajaCalidadRayado: 'rgb(6, 6, 6)',
  fuente: '14px sans-serif',
};
const DIMENSIONES: DimensionesLienzo = { anchoCss: 600, altoCss: 224, escala: 2 };

function latido(finMs: number, rrMs: number, extra: Partial<LatidoClasificado> = {}): LatidoClasificado {
  return { finMs, rrMs, aceptado: true, motivoDescarte: null, contiguoAlAnterior: true, ...extra };
}

const INSTANTANEA: InstantaneaVentana = {
  tiempoMs: 10_000,
  latidos: [
    latido(1000, 1000),
    latido(2000, 1000),
    latido(2700, 700, { aceptado: false, motivoDescarte: 'desviacion' }),
    latido(4000, 1300, { aceptado: false, motivoDescarte: 'desviacion' }),
    latido(5000, 1000),
    latido(6000, 1000),
    latido(9000, 1000, { contiguoAlAnterior: false }),
    latido(10_000, 1000),
  ],
  tramos: [{ inicioMs: 6000, finMs: 9000 }],
};

function dibujar(instantanea: InstantaneaVentana = INSTANTANEA): ContextoDibujoFalso {
  const ctx = new ContextoDibujoFalso();
  dibujarTacograma(ctx, instantanea, PALETA, DIMENSIONES);
  return ctx;
}

describe('dibujarTacograma', () => {
  it('limpia el lienzo completo y dibuja en píxeles CSS escalados', () => {
    const ctx = dibujar();
    expect(ctx.operaciones[1]).toMatchObject({ operacion: 'clearRect', argumentos: [0, 0, 1200, 448] });
    expect(ctx.operaciones[2]).toMatchObject({ operacion: 'setTransform', argumentos: [2, 0, 0, 2, 0, 0] });
  });

  it('usa solo colores de la paleta recibida', () => {
    const ctx = dibujar();
    const colores = new Set(Object.values(PALETA));
    for (const o of ctx.operaciones) {
      if (o.operacion === 'stroke') {
        expect(colores.has(String(o.strokeStyle))).toBe(true);
      }
      if (o.operacion === 'fillRect' || o.operacion === 'fillText') {
        expect(colores.has(String(o.fillStyle))).toBe(true);
      }
    }
  });

  it('marca cada latido descartado con una ×', () => {
    const ctx = dibujar();
    expect(ctx.contar('stroke', (o) => o.strokeStyle === PALETA.descartado)).toBe(2);
  });

  it('dibuja los tramos de baja calidad con fondo y rayado', () => {
    const ctx = dibujar();
    expect(ctx.contar('fillRect', (o) => o.fillStyle === PALETA.bajaCalidadFondo)).toBe(1);
    expect(ctx.contar('stroke', (o) => o.strokeStyle === PALETA.bajaCalidadRayado)).toBe(1);
    expect(ctx.contar('clip')).toBe(1);
  });

  it('corta la línea en los descartes y en los huecos', () => {
    const ctx = dibujar();
    const inicioLinea = ctx.operaciones.findIndex(
      (o) => o.operacion === 'beginPath' && o.strokeStyle === PALETA.linea,
    );
    const finLinea = ctx.operaciones.findIndex(
      (o, i) => i > inicioLinea && o.operacion === 'stroke' && o.strokeStyle === PALETA.linea,
    );
    const trazos = ctx.operaciones.slice(inicioLinea, finLinea);
    // Tres tramos: [1000, 2000], [5000, 6000] y [9000, 10000].
    expect(trazos.filter((o) => o.operacion === 'moveTo')).toHaveLength(3);
    expect(trazos.filter((o) => o.operacion === 'lineTo')).toHaveLength(3);
  });

  it('rotula los ejes con milisegundos y minutos de señal', () => {
    const textos = dibujar()
      .operaciones.filter((o) => o.operacion === 'fillText')
      .map((o) => o.argumentos[0]);
    expect(textos).toContain('1000 ms');
    expect(textos).toContain('0:00');
    expect(textos).toContain('5:00');
  });

  it('desplaza el eje de tiempo cuando la ventana ya está llena', () => {
    const textos = dibujar({ tiempoMs: 420_000, latidos: [], tramos: [] })
      .operaciones.filter((o) => o.operacion === 'fillText')
      .map((o) => o.argumentos[0]);
    expect(textos).toContain('2:00');
    expect(textos).toContain('7:00');
    expect(textos).not.toContain('0:00');
  });

  it('pone las marcas de tiempo en minutos enteros aunque la ventana empiece a mitad de minuto', () => {
    const textos = dibujar({ tiempoMs: 350_000, latidos: [], tramos: [] })
      .operaciones.filter((o) => o.operacion === 'fillText')
      .map((o) => o.argumentos[0])
      .filter((t) => typeof t === 'string' && !t.endsWith('ms'));
    expect(textos).toEqual(['1:00', '2:00', '3:00', '4:00', '5:00']);
  });

  it('dibuja ejes sin fallar cuando no hay datos', () => {
    const ctx = dibujar({ tiempoMs: 0, latidos: [], tramos: [] });
    expect(ctx.contar('fillText')).toBeGreaterThan(0);
    expect(ctx.contar('stroke', (o) => o.strokeStyle === PALETA.descartado)).toBe(0);
  });
});

describe('módulos del hilo de señal', () => {
  it('no contienen colores hexadecimales escritos a mano', () => {
    const raiz = path.resolve(process.cwd(), 'src', 'features', 'senal');
    const archivos = fs
      .readdirSync(raiz, { recursive: true, encoding: 'utf-8' })
      .filter((archivo) => /\.tsx?$/.test(archivo) && !/\.test\.tsx?$/.test(archivo));

    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const contenido = fs.readFileSync(path.join(raiz, archivo), 'utf-8');
      expect(contenido, archivo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
