import type { AmbienceId } from '../audio/core/ambienceCatalog';
import type { InstrumentId } from '../audio/core/instrumentCatalog';
import type { SoundProfile } from '../audio/engine/soundProfile';

/**
 * Sound worlds (ADR-64): named places a person can choose instead of setting
 * the instrument, the ambience and the texture one by one. A world is exactly
 * one combination of those three, plus a look of its own on the listening
 * screen. The dictionary words them and index.css holds their colours.
 */
export const WORLD_IDS = ['misty_forest', 'night_coast', 'city_rain', 'high_moor', 'deep_space', 'quiet_room'] as const;

export type WorldId = (typeof WORLD_IDS)[number];

/** How a session sounds: what a world stands for, and what the person can still set by hand. */
export interface SoundChoices {
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly profile: SoundProfile;
}

/** Each world is a different combination, so a combination names at most one world (a test keeps it so). */
export const WORLDS: Readonly<Record<WorldId, SoundChoices>> = {
  misty_forest: { instrument: 'bowls', ambience: 'wind', profile: 'immersive' },
  night_coast: { instrument: 'warm', ambience: 'sea', profile: 'original' },
  city_rain: { instrument: 'piano', ambience: 'rain', profile: 'original' },
  high_moor: { instrument: 'warm', ambience: 'wind', profile: 'minimal' },
  deep_space: { instrument: 'warm', ambience: 'none', profile: 'immersive' },
  quiet_room: { instrument: 'piano', ambience: 'none', profile: 'minimal' },
};

/**
 * The world a combination of sound choices is, or `null` when the person set
 * them to something no world uses. The world is never stored: it is read back
 * from the choices, so links, favorites and the history carry it for free.
 */
export function worldOf(choices: SoundChoices): WorldId | null {
  return WORLD_IDS.find((id) => {
    const world = WORLDS[id];
    return world.instrument === choices.instrument && world.ambience === choices.ambience && world.profile === choices.profile;
  }) ?? null;
}
