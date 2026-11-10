import { AMBIENCE_IDS, type AmbienceId } from '../audio/core/ambienceCatalog';
import { INSTRUMENT_IDS, type InstrumentId } from '../audio/core/instrumentCatalog';
import { isSoundProfile, type SoundProfile } from '../audio/engine/soundProfile';
import { isGoalId, type GoalId } from './goalCatalog';
import { DURATIONS_MIN, type DurationMin } from './plan';

export const FAVORITE_NAME_LIMIT = 60;

export interface FavoriteChoices {
  readonly duration: DurationMin;
  readonly goals: readonly GoalId[];
  readonly instrument: InstrumentId;
  readonly ambience: AmbienceId;
  readonly fixed: boolean;
  readonly profile: SoundProfile;
}

export interface FavoritePlan extends FavoriteChoices {
  readonly name: string;
}

function key(owner: string): string {
  return `neuromelody.favorites.${owner}`;
}

export function isFavoritePlan(value: unknown): value is FavoritePlan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Record<string, unknown>;
  return typeof plan.name === 'string' && plan.name.trim() === plan.name &&
    plan.name.length > 0 && plan.name.length <= FAVORITE_NAME_LIMIT &&
    DURATIONS_MIN.some((duration) => duration === plan.duration) &&
    Array.isArray(plan.goals) && plan.goals.length <= 1 && plan.goals.every(isGoalId) &&
    INSTRUMENT_IDS.some((instrument) => instrument === plan.instrument) &&
    AMBIENCE_IDS.some((ambience) => ambience === plan.ambience) &&
    typeof plan.fixed === 'boolean' && isSoundProfile(plan.profile);
}

export function readFavorites(owner: string): FavoritePlan[] {
  const value: unknown = JSON.parse(localStorage.getItem(key(owner)) ?? '[]');
  if (!Array.isArray(value) || !value.every(isFavoritePlan)) throw new TypeError('Invalid favorites.');
  return value;
}

export function writeFavorites(owner: string, plans: readonly FavoritePlan[]): void {
  localStorage.setItem(key(owner), JSON.stringify(plans));
}
