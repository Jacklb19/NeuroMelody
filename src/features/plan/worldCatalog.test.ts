import { describe, expect, it } from 'vitest';
import { AMBIENCE_IDS } from '../audio/core/ambienceCatalog';
import { INSTRUMENT_IDS } from '../audio/core/instrumentCatalog';
import { SOUND_PROFILES } from '../audio/engine/soundProfile';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { WORLD_IDS, WORLDS, worldOf } from './worldCatalog';

describe('worldCatalog', () => {
  it('builds every world from choices the person could also make by hand', () => {
    for (const id of WORLD_IDS) {
      const { instrument, ambience, profile } = WORLDS[id];
      expect(INSTRUMENT_IDS).toContain(instrument);
      expect(AMBIENCE_IDS).toContain(ambience);
      expect(SOUND_PROFILES).toContain(profile);
    }
  });

  it('gives each world its own combination, so the choices name one world at most', () => {
    const combinations = WORLD_IDS.map((id) => Object.values(WORLDS[id]).join('|'));
    expect(new Set(combinations).size).toBe(WORLD_IDS.length);
  });

  it('reads the world back from its sound choices', () => {
    for (const id of WORLD_IDS) expect(worldOf(WORLDS[id])).toBe(id);
  });

  it('names no world for a combination none of them uses', () => {
    expect(worldOf({ instrument: 'bowls', ambience: 'rain', profile: 'minimal' })).toBeNull();
  });

  it('has a name and a description for every world in both languages', () => {
    for (const { plan } of [es, en]) {
      for (const id of WORLD_IDS) {
        expect(plan.worlds.names[id]).not.toBe('');
        expect(plan.worlds.descriptions[id]).not.toBe('');
      }
    }
  });
});
