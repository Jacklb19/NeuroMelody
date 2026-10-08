import type { SignalQuality } from './processing/types';

/**
 * Glyph shown before each quality label. It is hidden from screen readers
 * and only reinforces the words, which come from the dictionary.
 */
export const QUALITY_ICONS: Readonly<Record<SignalQuality, string>> = {
  collecting: '…',
  good: '✓',
  low: '△',
};

/** Decimals of the LF/HF ratio; the other indicators are whole numbers. */
export const LF_HF_RATIO_DECIMALS = 2;
