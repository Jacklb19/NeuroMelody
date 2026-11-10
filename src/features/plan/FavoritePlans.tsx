import { useState } from 'react';
import { useMessages } from '../../i18n/messages';
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

/** Saves a named copy of the current plan and loads favorites into the editor. */
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
    <details className="glass-card listening-tools">
      <summary>{copy.favorites}</summary>
      <form className="action-row" onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed === '') return;
        update((current) => [...current.filter((plan) => plan.name !== trimmed), { ...choices, name: trimmed }], copy.savedFavorite);
      }}>
        <label>{copy.favoriteName}<input className="tool-input" required maxLength={FAVORITE_NAME_LIMIT} value={name} onChange={(event) => { setName(event.target.value); }} /></label>
        <button type="submit" className="pill-button pill-button-ghost">
          {plans?.some((plan) => plan.name === name.trim()) ? copy.updateFavorite : copy.saveFavorite}
        </button>
      </form>
      {plans !== null && plans.length > 0 && (
        <ul className="tool-list">
          {plans.map((plan) => (
            <li key={plan.name} className="action-row">
              <span>{plan.name}</span>
              <button type="button" className="pill-button pill-button-ghost" aria-label={`${copy.useFavorite}: ${plan.name}`} onClick={() => { onUse(plan); }}>{copy.useFavorite}</button>
              <button type="button" className="text-button" aria-label={`${copy.removeFavorite}: ${plan.name}`} onClick={() => {
                update((current) => current.filter((item) => item.name !== plan.name), copy.removedFavorite);
              }}>{copy.removeFavorite}</button>
            </li>
          ))}
        </ul>
      )}
      <p role="status">{plans === null && notice === '' ? copy.favoriteError : notice}</p>
    </details>
  );
}
