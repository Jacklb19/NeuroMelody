import { useId } from 'react';
import { MAX_RATING, MIN_RATING } from './sessionRecord';

const RATINGS = Array.from({ length: MAX_RATING - MIN_RATING + 1 }, (_, i) => MIN_RATING + i);

interface SelfRatingFieldProps {
  readonly legend: string;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
}

/**
 * Optional 0–10 self-rating (ADR-23). It records how the person says they
 * feel; the interface never treats it as a measurement or a threshold.
 */
export function SelfRatingField({ legend, value, onChange }: SelfRatingFieldProps): React.JSX.Element {
  const name = useId();
  const hintId = useId();
  return (
    <fieldset className="self-rating" aria-describedby={hintId}>
      <legend>{legend} <span className="optional-mark">(opcional)</span></legend>
      <p id={hintId} className="self-rating-hint">0 = nada bien · 10 = muy bien</p>
      <div className="rating-scale" style={{ '--option-count': RATINGS.length } as React.CSSProperties}>
        {RATINGS.map((rating) => (
          <label key={rating} className="rating-option">
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => { onChange(rating); }}
            />
            <span>{rating}</span>
          </label>
        ))}
      </div>
      {value !== null && (
        <button type="button" className="text-button" onClick={() => { onChange(null); }}>
          Quitar respuesta
        </button>
      )}
    </fieldset>
  );
}
