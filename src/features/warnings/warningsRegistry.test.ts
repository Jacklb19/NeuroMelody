import { describe, it, expect } from 'vitest';
import { CLAVE_ADVERTENCIAS, RegistroAdvertencias, type AlmacenClaveValor } from './warningsRegistry';

function almacenEnMemoria(): AlmacenClaveValor & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      datos.set(clave, valor);
    },
  };
}

const almacenQueFalla: AlmacenClaveValor = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('RegistroAdvertencias', () => {
  it('guarda la fecha de aceptación y la recuerda en la siguiente visita', () => {
    const almacen = almacenEnMemoria();
    const registro = new RegistroAdvertencias(almacen);
    expect(registro.aceptadas()).toBe(false);

    expect(registro.aceptar(new Date('2026-09-29T10:00:00Z'))).toBe(true);
    expect(almacen.datos.get(CLAVE_ADVERTENCIAS)).toBe('2026-09-29T10:00:00.000Z');
    expect(new RegistroAdvertencias(almacen).aceptadas()).toBe(true);
  });

  it('si el almacenamiento falla, acepta solo para la visita actual y vuelve a pedirlas después', () => {
    const registro = new RegistroAdvertencias(almacenQueFalla);
    expect(registro.aceptadas()).toBe(false);
    expect(registro.aceptar(new Date())).toBe(false);
    expect(registro.aceptadas()).toBe(true);

    expect(new RegistroAdvertencias(almacenQueFalla).aceptadas()).toBe(false);
  });

  it('funciona sin almacenamiento disponible', () => {
    const registro = new RegistroAdvertencias(null);
    expect(registro.aceptadas()).toBe(false);
    expect(registro.aceptar(new Date())).toBe(false);
    expect(registro.aceptadas()).toBe(true);
  });
});
