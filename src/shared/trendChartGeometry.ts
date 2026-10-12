/** Side of the square a trend chart is drawn on, in SVG user units; the SVG stretches it to fit. */
export const PLOT_SIZE = 100;

/** Lowest and highest value of the vertical axis. */
export interface Domain {
  readonly min: number;
  readonly max: number;
}

/**
 * An axis that holds every value and starts and ends on a multiple of
 * `step`, so its labels are round numbers. `null` without any value.
 */
export function roundDomain(values: readonly (number | null)[], step: number): Domain | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  const min = Math.floor(Math.min(...present) / step) * step;
  const max = Math.ceil(Math.max(...present) / step) * step;
  // A flat series still needs some height to be drawn on.
  return max === min ? { min, max: max + step } : { min, max };
}

/** Horizontal place of a point, oldest on the left; a lone point sits in the middle. */
export function plotX(index: number, count: number): number {
  return count > 1 ? (index / (count - 1)) * PLOT_SIZE : PLOT_SIZE / 2;
}

/** Vertical place of a value; SVG grows downwards, so the highest value is at 0. */
export function plotY(value: number, domain: Domain): number {
  return PLOT_SIZE - ((value - domain.min) / (domain.max - domain.min)) * PLOT_SIZE;
}

/**
 * SVG path of a series. A missing value breaks the line instead of being
 * bridged, so a session without data also looks like a gap.
 */
export function linePath(values: readonly (number | null)[], domain: Domain): string {
  let path = '';
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    const point = `${plotX(index, values.length).toFixed(2)},${plotY(value, domain).toFixed(2)}`;
    path += drawing ? ` L${point}` : `${path === '' ? '' : ' '}M${point}`;
    drawing = true;
  });
  return path;
}

/** The point closest to a horizontal position given as a share of the plot width (0 to 1). */
export function nearestIndex(share: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(share * (count - 1))));
}
