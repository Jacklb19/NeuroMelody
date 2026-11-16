import { useId, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { formatClock } from '../../shared/formatClock';

interface SeekBarProps {
  /** Where the piece is, in seconds. */
  readonly positionS: number;
  readonly lengthS: number;
  /** The point where the melody was saved, marked on the bar; `null` for a piece not saved. */
  readonly savedAtS: number | null;
  /** While the piece is being rebuilt at a new point, the bar waits. */
  readonly seeking: boolean;
  readonly onSeek: (seconds: number) => void;
}

/** Keys that move the bar: they jump when pressed, as the arrows of a player do. */
const STEP_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);
/** A small step of the arrows, and the large one of Page Up and Page Down, in seconds. */
const SMALL_STEP_S = 15;
const LARGE_STEP_S = 60;

/**
 * The time bar of a piece (ADR-67). It is a native range input, so it is a
 * slider for the keyboard and for screen readers. Dragging only moves the
 * thumb; the piece jumps when it is let go, because every jump rebuilds the
 * synthesizer at that point, and a jump per pixel would only stutter. The
 * keys jump at once, a step each.
 */
export function SeekBar({ positionS, lengthS, savedAtS, seeking, onSeek }: SeekBarProps): React.JSX.Element {
  const copy = useMessages().listen.player;
  const [dragS, setDragS] = useState<number | null>(null);
  const shownS = Math.min(lengthS, Math.max(0, dragS ?? positionS));
  const share = lengthS > 0 ? shownS / lengthS : 0;
  const savedShare = savedAtS === null || lengthS === 0 ? null : savedAtS / lengthS;
  const labelId = useId();

  const commit = (): void => {
    if (dragS === null) return;
    onSeek(dragS);
    setDragS(null);
  };

  return (
    <div className={seeking ? 'seek-bar is-seeking' : 'seek-bar'}
      style={{ '--seek-share': share, ...(savedShare === null ? {} : { '--saved-share': savedShare }) } as React.CSSProperties}>
      <span id={labelId} className="visually-hidden">{copy.seekLabel}</span>
      <div className="seek-track">
        <span className="seek-fill" aria-hidden="true" />
        {savedShare !== null && <span className="seek-saved" aria-hidden="true" title={copy.savedPoint(formatClock(savedAtS ?? 0))} />}
        <input
          type="range"
          className="seek-input"
          min={0}
          max={Math.max(1, Math.round(lengthS))}
          step={1}
          value={Math.round(shownS)}
          disabled={seeking}
          aria-labelledby={labelId}
          aria-valuetext={copy.seekValue(formatClock(shownS), formatClock(lengthS))}
          onChange={(event) => { setDragS(event.target.valueAsNumber); }}
          onPointerUp={commit}
          onKeyDown={(event) => {
            if (!STEP_KEYS.has(event.key)) return;
            event.preventDefault();
            const base = Math.round(dragS ?? positionS);
            const target = {
              ArrowLeft: base - SMALL_STEP_S, ArrowDown: base - SMALL_STEP_S, ArrowRight: base + SMALL_STEP_S, ArrowUp: base + SMALL_STEP_S,
              PageDown: base - LARGE_STEP_S, PageUp: base + LARGE_STEP_S, Home: 0, End: lengthS,
            }[event.key] ?? base;
            setDragS(null);
            onSeek(Math.min(lengthS, Math.max(0, target)));
          }}
          onBlur={commit}
        />
      </div>
      <p className="seek-times" aria-hidden="true">
        <span>{seeking ? copy.seeking : formatClock(shownS)}</span>
        <span>{formatClock(lengthS)}</span>
      </p>
      {savedAtS !== null && <p className="visually-hidden">{copy.savedPoint(formatClock(savedAtS))}</p>}
    </div>
  );
}
