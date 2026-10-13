/**
 * Layers and voice banks of the synthesizer, shared by the modules that
 * compose the notes and the ones that sound them.
 */

/** Layers the `layers` parameter turns on, in this order. */
export const LAYER = { drone: 0, harmony: 1, melody: 2 } as const;
export const LAYER_COUNT = 3;
/** The drone layer always sounds: at least one layer is active. */
export const MIN_LAYERS = 1;
/** Voice banks: the outgoing and the incoming mode of a crossfade. */
export const BANK_COUNT = 2;
