import type { ChartPalette } from '../features/signal/drawing/palette';

/**
 * Complete chart palette for tests that only need a valid one (Worker
 * boundary, thread client). Colours are distinct so a mix-up is visible;
 * lengths match the design tokens of src/index.css.
 */
export const TEST_CHART_PALETTE: ChartPalette = {
  line: 'rgb(1, 1, 1)',
  grid: 'rgb(2, 2, 2)',
  text: 'rgb(3, 3, 3)',
  discarded: 'rgb(4, 4, 4)',
  lowQualityBackground: 'rgb(5, 5, 5)',
  lowQualityHatch: 'rgb(6, 6, 6)',
  font: '14px sans-serif',
  marginLeft: 56,
  marginRight: 24,
  marginTop: 8,
  marginBottom: 24,
  labelOffset: 6,
  hatchSpacing: 8,
  markerHalfSize: 4,
  lineWidthGrid: 1,
  lineWidthHatch: 1,
  lineWidthSeries: 2,
  lineWidthDiscarded: 1.5,
};
