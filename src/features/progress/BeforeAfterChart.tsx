import { useId, useState } from 'react';
import { linePath, nearestIndex, plotX, plotY, PLOT_SIZE, type Domain } from '../../shared/trendChartGeometry';

/** One session on the chart: its value at the start and at the end. */
export interface ChartPoint {
  readonly key: string;
  /** Short date of the session, shown under the plot and in the readout. */
  readonly date: string;
  readonly start: number | null;
  readonly end: number | null;
}

interface BeforeAfterChartProps {
  /** Text alternative that states what the chart shows. */
  readonly label: string;
  /** How to move through the sessions with the keyboard. */
  readonly keyboardHint: string;
  /** Oldest first. */
  readonly points: readonly ChartPoint[];
  readonly domain: Domain;
  readonly legend: { readonly start: string; readonly end: string };
  /** A value with its unit, or the empty-value mark. */
  readonly formatValue: (value: number | null) => string;
  /** A figure of the vertical axis. */
  readonly formatTick: (value: number) => string;
}

const SERIES = ['start', 'end'] as const;

/** Shares of the axis that get a line and a figure: top, middle and bottom. */
const TICK_SHARES = [1, 0.5, 0] as const;

/** Keys that move the readout, and where each one takes it. */
const KEY_MOVES: Readonly<Record<string, (index: number | null, count: number) => number>> = {
  ArrowLeft: (index, count) => Math.max(0, (index ?? count) - 1),
  ArrowRight: (index, count) => Math.min(count - 1, (index ?? -1) + 1),
  Home: () => 0,
  End: (_index, count) => count - 1,
};
const CLOSE_KEY = 'Escape';

/** Position of a mark inside the plot, read by progress.css. */
const at = (x: number, y?: number): React.CSSProperties =>
  ({ '--x': x, ...(y === undefined ? {} : { '--y': y }) }) as React.CSSProperties;

/**
 * Two lines across sessions on one axis: the value at the start and at the
 * end of each. Pointing at a session, or reaching it with the arrow keys,
 * reads both values; the same figures are in the table of the page, so the
 * readout adds comfort and hides nothing.
 */
export function BeforeAfterChart({
  label, keyboardHint, points, domain, legend, formatValue, formatTick,
}: BeforeAfterChartProps): React.JSX.Element {
  const [active, setActive] = useState<number | null>(null);
  const hintId = useId();
  const count = points.length;
  const first = points[0];
  const last = points[count - 1];
  const shown = active === null ? undefined : points[active];

  const pointAt = (event: React.PointerEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex((event.clientX - bounds.left) / bounds.width, count));
  };

  return (
    <div className="trend-chart">
      <ul className="trend-legend">
        {SERIES.map((series) => (
          <li key={series}><span className={`trend-dot trend-dot-${series}`} aria-hidden="true" /> {legend[series]}</li>
        ))}
      </ul>
      <div className="trend-frame">
        <div className="trend-axis" aria-hidden="true">
          {TICK_SHARES.map((share) => (
            <span key={share}>{formatTick(domain.min + (domain.max - domain.min) * share)}</span>
          ))}
        </div>
        <div
          className="trend-plot"
          role="img"
          aria-label={label}
          aria-describedby={hintId}
          tabIndex={0}
          onPointerDown={pointAt}
          onPointerMove={pointAt}
          // A finger leaves the screen after every tap: only a mouse leaving hides the readout.
          onPointerLeave={(event) => { if (event.pointerType === 'mouse') setActive(null); }}
          onFocus={() => { setActive((current) => current ?? count - 1); }}
          onBlur={() => { setActive(null); }}
          onKeyDown={(event) => {
            if (event.key === CLOSE_KEY) {
              setActive(null);
              return;
            }
            const move = KEY_MOVES[event.key];
            if (move === undefined) return;
            event.preventDefault();
            setActive((current) => move(current, count));
          }}
        >
          <svg viewBox={`0 0 ${String(PLOT_SIZE)} ${String(PLOT_SIZE)}`} preserveAspectRatio="none" aria-hidden="true">
            {TICK_SHARES.map((share) => (
              <line
                key={share}
                className="trend-grid"
                x1={0}
                x2={PLOT_SIZE}
                y1={PLOT_SIZE * (1 - share)}
                y2={PLOT_SIZE * (1 - share)}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {SERIES.map((series) => (
              <path
                key={series}
                className={`trend-line trend-line-${series}`}
                d={linePath(points.map((point) => point[series]), domain)}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {shown !== undefined && active !== null && <span className="trend-crosshair" style={at(plotX(active, count))} />}
          {points.map((point, index) => SERIES.map((series) => {
            const value = point[series];
            return value === null ? null : (
              <span
                key={`${point.key}-${series}`}
                className={`trend-dot trend-dot-${series}${index === active ? ' is-active' : ''}`}
                style={at(plotX(index, count), plotY(value, domain))}
              />
            );
          }))}
          {shown !== undefined && active !== null && (
            <div
              className="trend-readout"
              data-side={plotX(active, count) > PLOT_SIZE / 2 ? 'left' : 'right'}
              style={at(plotX(active, count))}
              data-testid="trend-readout"
            >
              <p className="trend-readout-date">{shown.date}</p>
              {SERIES.map((series) => (
                <p key={series}>
                  <span className={`trend-dot trend-dot-${series}`} aria-hidden="true" />
                  <strong>{formatValue(shown[series])}</strong> {legend[series]}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="trend-dates" aria-hidden="true">
        {first !== undefined && <span>{first.date}</span>}
        {last !== undefined && count > 1 && <span>{last.date}</span>}
      </div>
      <p id={hintId} hidden>{keyboardHint}</p>
    </div>
  );
}
