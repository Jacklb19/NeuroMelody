import { useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { ChevronRightIcon, HeartIcon } from '../../shared/icons';
import { FAVORITE_NAME_LIMIT, readFavorites, writeFavorites, type FavoriteChoices, type FavoritePlan } from './favorites';

interface FavoritePlansProps {
  readonly owner: string;
  readonly choices: FavoriteChoices;
  readonly onUse: (plan: FavoritePlan) => void;
}

function load(owner: string): FavoritePlan[] | null {
  try {
    return readFavorites(owner);
  } catch {
    return null;
  }
}

/**
 * Saves a named copy of the current plan and loads favorites into the editor.
 * Folded by default; each saved plan is a chip that applies it in one click.
 */
export function FavoritePlans({ owner, choices, onUse }: FavoritePlansProps): React.JSX.Element {
  const copy = useMessages().listeningTools;
  const [plans, setPlans] = useState(() => load(owner));
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const update = (change: (current: FavoritePlan[]) => FavoritePlan[], message: string): void => {
    try {
      const next = change(readFavorites(owner));
      writeFavorites(owner, next);
      setPlans(next);
      setNotice(message);
    } catch {
      setNotice(copy.favoriteError);
    }
  };

  return (
    <details className="glass-card favorites-card">
      <summary className="favorites-summary">
        <span className="icon-badge"><HeartIcon /></span>
        <span className="favorites-heading">
          <strong>{copy.favorites}</strong>
          <span className="secondary-text">{copy.favoritesHint}</span>
        </span>
        <ChevronRightIcon className="favorites-chevron" />
      </summary>
      {plans !== null && plans.length > 0 && (
        <ul className="favorite-chips">
          {plans.map((plan) => (
            <li key={plan.name} className="favorite-chip">
              <button type="button" className="favorite-use" aria-label={`${copy.useFavorite}: ${plan.name}`} onClick={() => { onUse(plan); }}>
                {plan.name}
              </button>
              <button type="button" className="favorite-remove" aria-label={`${copy.removeFavorite}: ${plan.name}`} onClick={() => {
                update((current) => current.filter((item) => item.name !== plan.name), copy.removedFavorite);
              }}>×</button>
            </li>
          ))}
        </ul>
      )}
      <form className="favorites-form" onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed === '') return;
        update((current) => [...current.filter((plan) => plan.name !== trimmed), { ...choices, name: trimmed }], copy.savedFavorite);
      }}>
        <label className="favorites-name">
          {copy.favoriteName}
          <input className="tool-input" required maxLength={FAVORITE_NAME_LIMIT} placeholder={copy.favoritePlaceholder} value={name} onChange={(event) => { setName(event.target.value); }} />
        </label>
        <button type="submit" className="pill-button pill-button-primary">
          {plans?.some((plan) => plan.name === name.trim()) ? copy.updateFavorite : copy.saveFavorite}
        </button>
      </form>
      <p role="status" className="favorites-status">{plans === null && notice === '' ? copy.favoriteError : notice}</p>
    </details>
  );
}
