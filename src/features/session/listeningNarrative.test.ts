import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import type { ConnectionState } from '../acquisition/contract';
import { ACTIVATION_STATE_IDS, type ActivationState } from '../adaptation/activationStates';
import { describeListening, LISTENING_NARRATIVE_IDS } from './listeningNarrative';

const CONNECTIONS: readonly ConnectionState[] = ['disconnected', 'connecting', 'connected', 'reconnecting', 'error'];
const STATES: readonly (ActivationState | null)[] = [null, ...ACTIVATION_STATE_IDS];
const NARRATIVES = es.session.narrative;

describe('describeListening', () => {
  it('asks for a signal before describing the body', () => {
    expect(describeListening({ connection: 'disconnected', state: 'high', qualityGood: true, musicPlaying: true }))
      .toBe('noSource');
    expect(describeListening({ connection: 'reconnecting', state: 'low', qualityGood: true, musicPlaying: true }))
      .toBe('reconnecting');
  });

  it('explains the calibration before any estimate exists', () => {
    expect(describeListening({ connection: 'connected', state: null, qualityGood: false, musicPlaying: true }))
      .toBe('calibrating');
  });

  it('says the music is stopped instead of blaming the sensor', () => {
    expect(describeListening({ connection: 'connected', state: 'low', qualityGood: false, musicPlaying: false }))
      .toBe('musicStopped');
  });

  it('waits for a clear signal instead of describing a poor one', () => {
    expect(describeListening({ connection: 'connected', state: 'high', qualityGood: false, musicPlaying: true }))
      .toBe('unclearSignal');
  });

  it('describes each accepted state relative to the starting point', () => {
    for (const state of ACTIVATION_STATE_IDS) {
      expect(describeListening({ connection: 'connected', state, qualityGood: true, musicPlaying: true })).toBe(state);
    }
    expect(NARRATIVES.high.title).toMatch(/más activo/);
    expect(NARRATIVES.low.title).toMatch(/más tranquilo/);
    expect(NARRATIVES.uncertain.title).toMatch(/cerca del inicio/);
  });

  it('has a title and a detail for every situation it can choose', () => {
    for (const connection of CONNECTIONS) {
      for (const state of STATES) {
        for (const [qualityGood, musicPlaying] of [[true, true], [false, true], [true, false], [false, false]] as const) {
          expect(LISTENING_NARRATIVE_IDS).toContain(describeListening({ connection, state, qualityGood, musicPlaying }));
        }
      }
    }
    for (const id of LISTENING_NARRATIVE_IDS) {
      expect(NARRATIVES[id].title.trim()).not.toBe('');
      expect(NARRATIVES[id].detail.trim()).not.toBe('');
    }
  });

  it('never uses clinical language or therapeutic promises', () => {
    for (const { title, detail } of Object.values(NARRATIVES)) {
      expect(`${title} ${detail}`).not.toMatch(
        /dolor|estrés|ansiedad|diagnós|arritmi|anómal|ectópic|terapia|cura\b|alivia|síntoma/i,
      );
    }
  });
});
