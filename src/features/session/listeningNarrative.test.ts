import { describe, expect, it } from 'vitest';
import type { ConnectionState } from '../acquisition/contract';
import type { ActivationState } from '../adaptation/AdaptationEngine';
import { describeListening } from './listeningNarrative';

const CONNECTIONS: readonly ConnectionState[] = ['disconnected', 'connecting', 'connected', 'reconnecting', 'error'];
const STATES: readonly (ActivationState | null)[] = [null, 'high', 'low', 'uncertain'];

describe('describeListening', () => {
  it('asks for a signal before describing the body', () => {
    expect(describeListening({ connection: 'disconnected', state: 'high', qualityGood: true }).title)
      .toBe('Conecta una fuente de señal');
    expect(describeListening({ connection: 'reconnecting', state: 'low', qualityGood: true }).title)
      .toBe('Recuperando la conexión');
  });

  it('explains the calibration before any estimate exists', () => {
    expect(describeListening({ connection: 'connected', state: null, qualityGood: false }).title)
      .toBe('Tomando tu referencia');
  });

  it('waits for a clear signal instead of describing a poor one', () => {
    expect(describeListening({ connection: 'connected', state: 'high', qualityGood: false }).title)
      .toBe('Esperando una señal clara');
  });

  it('describes each accepted state relative to the starting point', () => {
    expect(describeListening({ connection: 'connected', state: 'high', qualityGood: true }).title).toMatch(/más activo/);
    expect(describeListening({ connection: 'connected', state: 'low', qualityGood: true }).title).toMatch(/más tranquilo/);
    expect(describeListening({ connection: 'connected', state: 'uncertain', qualityGood: true }).title).toMatch(/cerca del inicio/);
  });

  it('never uses clinical language or therapeutic promises', () => {
    for (const connection of CONNECTIONS) {
      for (const state of STATES) {
        for (const qualityGood of [true, false]) {
          const { title, detail } = describeListening({ connection, state, qualityGood });
          expect(`${title} ${detail}`).not.toMatch(
            /dolor|estrés|ansiedad|diagnós|arritmi|anómal|ectópic|terapia|cura\b|alivia|síntoma/i,
          );
        }
      }
    }
  });
});
