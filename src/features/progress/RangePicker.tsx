import { useMessages } from '../../i18n/messages';
import { PROGRESS_RANGE_IDS, PROGRESS_RANGE_SIZES, type ProgressRangeId } from './progressRangeCatalog';
import './progress.css';

interface RangePickerProps {
  readonly value: ProgressRangeId;
  readonly onChange: (range: ProgressRangeId) => void;
}

/** Which sessions a view covers, counted from the most recent: one pill per option of the range catalog. */
export function RangePicker({ value, onChange }: RangePickerProps): React.JSX.Element {
  const copy = useMessages().progress.range;
  return (
    <div className="range-picker" role="group" aria-label={copy.label}>
      {PROGRESS_RANGE_IDS.map((id) => {
        const size = PROGRESS_RANGE_SIZES[id];
        return (
          <button
            key={id}
            type="button"
            className="pill-button pill-button-ghost"
            aria-pressed={id === value}
            onClick={() => { onChange(id); }}
          >
            {size === null ? copy.all : copy.last(size)}
          </button>
        );
      })}
    </div>
  );
}
