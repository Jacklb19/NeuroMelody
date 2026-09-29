import { describe, it, expect } from 'vitest';
import { DURACION_FUNDIDO_S, NucleoSintesis, PULSOS_POR_CICLO } from './NucleoSintesis';
import { MODO } from './teoria';

const FS = 48_000;
const BLOQUE = 128;

interface Parametros {
  tempo: number;
  modo: number;
  capas: number;
}

/** Renderiza `segundos` de audio bloque a bloque; `alBloque` puede cambiar los parámetros. */
function renderizar(
  nucleo: NucleoSintesis,
  segundos: number,
  parametros: Parametros,
  alBloque?: (tiempoS: number, p: Parametros) => void,
): Float32Array {
  const total = Math.floor((segundos * FS) / BLOQUE) * BLOQUE;
  const salida = new Float32Array(total);
  const bloque = new Float32Array(BLOQUE);
  for (let inicio = 0; inicio < total; inicio += BLOQUE) {
    alBloque?.(inicio / FS, parametros);
    nucleo.procesar(bloque, parametros.tempo, parametros.modo, parametros.capas);
    salida.set(bloque, inicio);
  }
  return salida;
}

function rms(muestras: Float32Array, desde: number, hasta: number): number {
  let suma = 0;
  for (let i = desde; i < hasta; i++) {
    suma += (muestras[i] ?? 0) ** 2;
  }
  return Math.sqrt(suma / (hasta - desde));
}

describe('NucleoSintesis', () => {
  it('es determinista para una misma semilla y cambia con otra', () => {
    const p = { tempo: 66, modo: MODO.lidio, capas: 3 };
    const a = renderizar(new NucleoSintesis(FS, 7), 10, { ...p });
    const b = renderizar(new NucleoSintesis(FS, 7), 10, { ...p });
    const c = renderizar(new NucleoSintesis(FS, 8), 10, { ...p });
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it('suena desde el primer medio segundo (HU-03)', () => {
    const nucleo = new NucleoSintesis(FS, 1);
    nucleo.fijarCapasIniciales(2);
    const salida = renderizar(nucleo, 0.5, { tempo: 66, modo: MODO.lidio, capas: 2 });
    expect(rms(salida, 0, salida.length)).toBeGreaterThan(0.01);
  });

  it('en 60 s con cambios de nivel no produce NaN, desbordes ni saltos bruscos', () => {
    const nucleo = new NucleoSintesis(FS, 3);
    nucleo.fijarCapasIniciales(3);
    const salida = renderizar(nucleo, 60, { tempo: 76, modo: MODO.pentatonicaMayor, capas: 3 }, (t, p) => {
      if (t >= 10) {
        p.modo = MODO.lidio;
        p.capas = 2;
        p.tempo = Math.max(66, 76 - (t - 10) / 2); // rampa de 20 s de 76 a 66
      }
      if (t >= 40) {
        p.modo = MODO.bordonPentatonica;
      }
    });

    let maximo = 0;
    let saltoMaximo = 0;
    let noFinitas = 0;
    for (let i = 0; i < salida.length; i++) {
      const x = salida[i] ?? 0;
      if (!Number.isFinite(x)) {
        noFinitas++;
      }
      maximo = Math.max(maximo, Math.abs(x));
      if (i > 0) {
        saltoMaximo = Math.max(saltoMaximo, Math.abs(x - (salida[i - 1] ?? 0)));
      }
    }
    expect(noFinitas).toBe(0);
    // Margen amplio bajo 1,0 antes del volumen maestro, el compresor y el recorte.
    expect(maximo).toBeLessThan(0.8);
    // Un chasquido es un salto de muestra a muestra muy superior al de estas frecuencias.
    expect(saltoMaximo).toBeLessThan(0.05);
  }, 30_000);

  it('nunca roba una voz en 3 minutos con las tres capas al tempo más alto', () => {
    const nucleo = new NucleoSintesis(FS, 11);
    nucleo.fijarCapasIniciales(3);
    renderizar(nucleo, 180, { tempo: 76, modo: MODO.lidio, capas: 3 });
    expect(nucleo.robosDeVoz).toBe(0);
  }, 30_000);

  it('respeta el tempo: pulsos 0 a 60 en 60,5 s a 60 BPM', () => {
    const nucleo = new NucleoSintesis(FS, 1);
    renderizar(nucleo, 60.5, { tempo: 60, modo: MODO.lidio, capas: 1 });
    // El primer pulso ocurre en la muestra 0 (pulso 0).
    expect(nucleo.pulso).toBe(60);
  });

  it('aplica el cambio de modo al cerrar el ciclo y hace un fundido cruzado de 30 s', () => {
    const nucleo = new NucleoSintesis(FS, 5, MODO.pentatonicaMayor);
    const p = { tempo: 60, modo: MODO.pentatonicaMayor as number, capas: 2 };
    // A 60 BPM un ciclo de 16 pulsos dura 16 s. Se pide lidio en el pulso 5.
    renderizar(nucleo, 5.5, p);
    expect(nucleo.pulso % PULSOS_POR_CICLO).toBe(5);
    p.modo = MODO.lidio;
    renderizar(nucleo, 10, p); // hasta 15,5 s: el ciclo sigue abierto
    expect(nucleo.modoActual).toBe(MODO.pentatonicaMayor);
    expect(nucleo.bancoActivo).toBe(0);

    renderizar(nucleo, 1, p); // cruza el pulso 16 (16 s)
    expect(nucleo.modoActual).toBe(MODO.lidio);
    expect(nucleo.bancoActivo).toBe(1);

    renderizar(nucleo, DURACION_FUNDIDO_S / 2 - 0.5, p); // ≈ 15 s de fundido
    expect(nucleo.gananciaBanco(1)).toBeCloseTo(0.5, 1);
    expect(nucleo.gananciaBanco(0)).toBeCloseTo(0.5, 1);

    renderizar(nucleo, DURACION_FUNDIDO_S / 2 + 1, p);
    expect(nucleo.gananciaBanco(1)).toBe(1);
    expect(nucleo.gananciaBanco(0)).toBe(0);
  });

  it('enciende y apaga capas con un fundido de 30 s', () => {
    const nucleo = new NucleoSintesis(FS, 2);
    nucleo.fijarCapasIniciales(3);
    const p = { tempo: 66, modo: MODO.lidio, capas: 1 };
    renderizar(nucleo, DURACION_FUNDIDO_S / 2, p);
    expect(nucleo.gananciaCapa(2)).toBeCloseTo(0.5, 2);
    expect(nucleo.gananciaCapa(1)).toBeCloseTo(0.5, 2);
    expect(nucleo.gananciaCapa(0)).toBe(1);

    renderizar(nucleo, DURACION_FUNDIDO_S / 2 + 0.1, p);
    expect(nucleo.gananciaCapa(2)).toBe(0);
    expect(nucleo.gananciaCapa(1)).toBe(0);
  });

  it('acota las capas pedidas entre 1 y 3', () => {
    const nucleo = new NucleoSintesis(FS, 2);
    nucleo.fijarCapasIniciales(9);
    expect([nucleo.gananciaCapa(0), nucleo.gananciaCapa(1), nucleo.gananciaCapa(2)]).toEqual([1, 1, 1]);
    nucleo.fijarCapasIniciales(0);
    expect([nucleo.gananciaCapa(0), nucleo.gananciaCapa(1), nucleo.gananciaCapa(2)]).toEqual([1, 0, 0]);
  });
});
