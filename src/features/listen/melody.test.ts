import { describe, expect, it } from 'vitest';
import { MAX_START_AT_S, SYNTHESIS_VERSION } from '../audio/core/SynthesisCore';
import { createMelody, MELODY_NAME_LIMIT, readMelody, renameMelody, soundsAsSaved, type MelodyContent } from './melody';

const CONTENT: MelodyContent = {
  name: 'Bosque de niebla',
  seed: 123_456,
  instrument: 'bowls',
  ambience: 'wind',
  profile: 'immersive',
  level: 'target',
  positionS: 720,
  musicMix: 1,
  ambienceMix: 0.6,
};
const NOW = new Date('2026-11-16T21:00:00.000Z');

describe('melody', () => {
  it('creates a melody of an account with the synthesizer of this build', () => {
    const melody = createMelody(CONTENT, 'ana', NOW);
    expect(melody).toMatchObject({ ...CONTENT, ownerId: 'ana', synthesisVersion: SYNTHESIS_VERSION, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() });
    expect(readMelody(melody)).toEqual(melody);
    expect(soundsAsSaved(melody)).toBe(true);
  });

  it('keeps the saved point whole and within what the synthesizer can reach', () => {
    expect(createMelody({ ...CONTENT, positionS: 12.6 }, 'ana', NOW).positionS).toBe(13);
    expect(createMelody({ ...CONTENT, positionS: MAX_START_AT_S + 50 }, 'ana', NOW).positionS).toBe(MAX_START_AT_S);
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a name with spaces around it', { name: ' Bosque' }],
    ['a name too long', { name: 'x'.repeat(MELODY_NAME_LIMIT + 1) }],
    ['a negative seed', { seed: -1 }],
    ['a seed beyond 32 bits', { seed: 2 ** 31 }],
    ['an unknown instrument', { instrument: 'trumpet' }],
    ['an unknown step', { level: 'fast' }],
    ['a point beyond two hours', { positionS: MAX_START_AT_S + 1 }],
    ['a mix above one', { musicMix: 1.2 }],
    ['a change before its creation', { updatedAt: '2026-11-16T20:00:00.000Z' }],
    ['no owner', { ownerId: '' }],
    ['an id that is not a UUID', { id: 'melody-1' }],
  ])('refuses %s', (_, change) => {
    expect(readMelody({ ...createMelody(CONTENT, 'ana', NOW), ...change })).toBeNull();
  });

  it('dates a new name after the last change, even with a clock that went back', () => {
    const melody = createMelody(CONTENT, 'ana', NOW);
    const renamed = renameMelody(melody, '  Mi bosque ', new Date('2026-11-16T20:00:00.000Z'));
    expect(renamed.name).toBe('Mi bosque');
    expect(Date.parse(renamed.updatedAt)).toBeGreaterThan(Date.parse(melody.updatedAt));
  });

  it('tells a melody of an older synthesizer', () => {
    expect(soundsAsSaved({ ...createMelody(CONTENT, 'ana', NOW), synthesisVersion: SYNTHESIS_VERSION + 1 })).toBe(false);
  });
});
