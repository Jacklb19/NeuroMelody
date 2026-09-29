import { describe, it, expect } from 'vitest';
import { ESCALAS, MIDI_BORDON, MIDI_TONICA, MODO, esModo, frecuenciaMidi, notaDeGrado } from './teoria';

describe('teoría musical de la sesión', () => {
  it('usa re3 como tónica y re2 como bordón', () => {
    expect(frecuenciaMidi(MIDI_TONICA)).toBeCloseTo(146.832, 3);
    expect(frecuenciaMidi(MIDI_BORDON)).toBeCloseTo(73.416, 3);
    expect(frecuenciaMidi(69)).toBe(440);
  });

  it('la pentatónica mayor de re está contenida en el lidio de re', () => {
    const lidio = new Set(ESCALAS[MODO.lidio]);
    expect(ESCALAS[MODO.pentatonicaMayor].every((s) => lidio.has(s))).toBe(true);
    expect(ESCALAS[MODO.bordonPentatonica]).toEqual(ESCALAS[MODO.pentatonicaMayor]);
  });

  it('calcula notas de grado, también por encima de la octava', () => {
    const pentatonica = ESCALAS[MODO.pentatonicaMayor];
    expect(notaDeGrado(pentatonica, 0, 50)).toBe(50); // re
    expect(notaDeGrado(pentatonica, 3, 50)).toBe(57); // la
    expect(notaDeGrado(pentatonica, 5, 50)).toBe(62); // re una octava arriba
    expect(notaDeGrado(pentatonica, 7, 50)).toBe(66); // fa#
  });

  it('reconoce solo los tres modos', () => {
    expect([0, 1, 2].every(esModo)).toBe(true);
    expect(esModo(3)).toBe(false);
    expect(esModo(-1)).toBe(false);
  });
});
