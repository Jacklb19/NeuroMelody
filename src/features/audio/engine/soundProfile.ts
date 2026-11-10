export const SOUND_PROFILES = ['original', 'minimal', 'immersive'] as const;

export type SoundProfile = (typeof SOUND_PROFILES)[number];
export type MixTrack = 'music' | 'ambience';

export function isSoundProfile(value: unknown): value is SoundProfile {
  return SOUND_PROFILES.some((profile) => profile === value);
}

/** The minimal texture plays the foundation of the current musical level. */
export function profileLayers(profile: SoundProfile, layers: number): number {
  return profile === 'minimal' ? Math.min(1, layers) : layers;
}

/** Texture changes the wet signal while the output still runs through the limiter. */
export function profileReverb(profile: SoundProfile, gain: number): number {
  if (profile === 'minimal') return gain * 0.5;
  if (profile === 'immersive') return Math.min(1, gain * 1.25);
  return gain;
}
