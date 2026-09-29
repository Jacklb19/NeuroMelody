import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ErrorPaletaGrafica,
  leerPaletaGrafica,
  VARIABLE_FAMILIA,
  VARIABLE_TAMANO,
  VARIABLES_PALETA,
  type EstilosCalculados,
} from './palette';

function estilos(valores: Record<string, string>): EstilosCalculados {
  return { getPropertyValue: (nombre: string) => valores[nombre] ?? '' };
}

const COMPLETOS: Record<string, string> = {
  '--color-grafica-linea': ' #2563eb',
  '--color-grafica-rejilla': '#e5e7eb',
  '--color-grafica-texto': '#4b5563',
  '--color-grafica-descartado': '#78716c',
  '--color-grafica-baja-calidad-fondo': '#fffbeb',
  '--color-grafica-baja-calidad-rayado': '#a16207',
  '--fuente-base': 'system-ui, sans-serif',
  '--texto-sm': '0.875rem',
  'font-size': '16px',
};

describe('leerPaletaGrafica', () => {
  it('lee los colores de las variables CSS y convierte el tamaño de rem a px', () => {
    expect(leerPaletaGrafica(estilos(COMPLETOS))).toEqual({
      linea: '#2563eb',
      rejilla: '#e5e7eb',
      texto: '#4b5563',
      descartado: '#78716c',
      bajaCalidadFondo: '#fffbeb',
      bajaCalidadRayado: '#a16207',
      fuente: '14px system-ui, sans-serif',
    });
  });

  it('acepta un tamaño en px', () => {
    const paleta = leerPaletaGrafica(estilos({ ...COMPLETOS, '--texto-sm': '13px' }));
    expect(paleta.fuente).toBe('13px system-ui, sans-serif');
  });

  it.each(Object.values(VARIABLES_PALETA).concat([VARIABLE_FAMILIA, VARIABLE_TAMANO]))(
    'lanza un error explícito si falta %s',
    (variable) => {
      const incompletos = { ...COMPLETOS, [variable]: '' };
      expect(() => leerPaletaGrafica(estilos(incompletos))).toThrow(ErrorPaletaGrafica);
      expect(() => leerPaletaGrafica(estilos(incompletos))).toThrow(variable);
    },
  );

  it('lanza un error si el tamaño no se puede interpretar', () => {
    expect(() => leerPaletaGrafica(estilos({ ...COMPLETOS, '--texto-sm': 'mediano' }))).toThrow(
      ErrorPaletaGrafica,
    );
  });
});

describe('tokens de la gráfica en src/index.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src', 'index.css'), 'utf-8');
  const tokens = new Map(
    [...css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );

  function resolver(nombre: string): string {
    const valor = tokens.get(nombre) ?? '';
    const referencia = /^var\((--[a-z0-9-]+)\)$/.exec(valor);
    return referencia?.[1] === undefined ? valor : resolver(referencia[1]);
  }

  function luminancia(hex: string): number {
    const canales = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r = 0, g = 0, b = 0] = canales.map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contraste(a: string, b: string): number {
    const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return ((claro ?? 0) + 0.05) / ((oscuro ?? 0) + 0.05);
  }

  it('define todas las variables que lee la paleta', () => {
    for (const variable of [...Object.values(VARIABLES_PALETA), VARIABLE_FAMILIA, VARIABLE_TAMANO]) {
      expect(resolver(variable), variable).not.toBe('');
    }
  });

  it('no reutiliza los colores de error en la gráfica', () => {
    const errores = new Set([resolver('--color-error-texto'), resolver('--color-error-fondo')]);
    for (const variable of Object.values(VARIABLES_PALETA)) {
      expect(errores.has(resolver(variable)), variable).toBe(false);
    }
  });

  it.each([
    ['--color-grafica-linea', '--color-fondo'],
    ['--color-grafica-linea', '--color-grafica-baja-calidad-fondo'],
    ['--color-grafica-descartado', '--color-fondo'],
    ['--color-grafica-descartado', '--color-grafica-baja-calidad-fondo'],
    ['--color-grafica-baja-calidad-rayado', '--color-fondo'],
    ['--color-grafica-baja-calidad-rayado', '--color-grafica-baja-calidad-fondo'],
    ['--color-grafica-texto', '--color-fondo'],
  ])('%s tiene al menos 3:1 de contraste sobre %s', (primerPlano, fondo) => {
    expect(contraste(resolver(primerPlano), resolver(fondo))).toBeGreaterThanOrEqual(3);
  });
});
