import type { Messages } from '../../../i18n/messages';

/**
 * Text drawn on the chart. The Worker has no dictionary, so the main thread
 * builds the labels from it and sends them with the palette (ADR-25).
 */
export interface ChartLabels {
  /** RR tick label with {@link VALUE_SLOT} where the value goes, e.g. "{value} ms". */
  readonly rrTick: string;
}

/**
 * Marks where a figure goes in a label. Dictionary functions cannot cross to
 * the Worker, so they are turned into templates with this slot.
 */
export const VALUE_SLOT = '{value}';

/** Builds the chart labels from the shared units of the dictionary. */
export function chartLabelsFrom(common: Messages['common']): ChartLabels {
  return { rrTick: common.withUnit(VALUE_SLOT, common.units.milliseconds) };
}

/** Puts a figure into a label template. */
export function fillValueSlot(template: string, value: string): string {
  return template.replace(VALUE_SLOT, () => value);
}
