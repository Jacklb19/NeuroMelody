/** Drawing area of a sparkline in SVG user units; the SVG stretches it to fit. */
export const SPARKLINE_WIDTH = 100;
export const SPARKLINE_HEIGHT = 32;

/**
 * Builds the SVG path of a sparkline. Missing values break the line instead
 * of being bridged, so a gap in the signal also looks like a gap. A flat
 * series sits in the middle rather than on an edge.
 */
export function sparklinePath(values: readonly (number | null)[]): string {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return '';
  const min = Math.min(...present);
  const max = Math.max(...present);
  const step = values.length > 1 ? SPARKLINE_WIDTH / (values.length - 1) : 0;
  const y = (value: number): number =>
    max === min ? SPARKLINE_HEIGHT / 2 : SPARKLINE_HEIGHT - ((value - min) / (max - min)) * SPARKLINE_HEIGHT;

  let path = '';
  let drawing = false;
  values.forEach((value, i) => {
    if (value === null) {
      drawing = false;
      return;
    }
    const point = `${(i * step).toFixed(2)},${y(value).toFixed(2)}`;
    path += drawing ? ` L${point}` : `${path === '' ? '' : ' '}M${point}`;
    drawing = true;
  });
  return path;
}
