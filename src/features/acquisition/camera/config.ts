/**
 * Tuning of the camera pulse prototype (proposal P-01). Provisional values,
 * chosen on a few phones; none of them has been validated against a strap.
 * The plausible beat interval is not repeated here: the detector uses the
 * range of the beat filter (signal/processing/thresholds.ts, ADR-15).
 */

/** Rear camera, the one next to the flashlight. */
export const CAMERA_FACING_MODE = 'environment';
/** Requested capture size and rate; the browser may deliver something close. */
export const CAPTURE_WIDTH = 320;
export const CAPTURE_HEIGHT = 240;
export const CAMERA_FRAME_RATE = 30;

/** Frames are reduced to this size: only the average colour matters. */
export const SAMPLE_WIDTH = 40;
export const SAMPLE_HEIGHT = 30;

/**
 * A fingertip lit by the torch fills the image with bright red and little
 * green.
 */
export const MIN_FINGER_RED = 100;
export const MIN_RED_TO_GREEN = 2;

/** Window of the moving mean removed from the signal: slower changes are not pulse. */
export const BASELINE_WINDOW_MS = 1500;
/** Frames averaged to smooth sensor noise: about 100 ms at CAMERA_FRAME_RATE. */
export const SMOOTHING_FRAMES = 3;
/** A peak must reach this share of the recent amplitude to count as a beat. */
export const PEAK_THRESHOLD = 0.4;
/** Window over which the recent amplitude is measured. */
export const AMPLITUDE_WINDOW_MS = 2000;
/** Points on each side of a candidate peak used to confirm and refine it. */
export const PEAK_HALF_WIDTH = 2;

/** Intervals shown in the panel's list. */
export const RECENT_INTERVALS = 8;
/** Latest intervals whose median gives the pulse estimate, and how many are needed first. */
export const PULSE_INTERVALS = 5;
export const MIN_PULSE_INTERVALS = 3;
/** Interval over which the delivered frame rate is measured. */
export const FRAME_RATE_WINDOW_MS = 1000;

/** Drawing resolution of the waveform canvas; CSS scales it to the layout. */
export const WAVEFORM_WIDTH = 600;
export const WAVEFORM_HEIGHT = 120;
/** Vertical margin of the waveform, in canvas pixels; its colour and width come from the chart tokens. */
export const WAVEFORM_MARGIN = 4;
/** Smallest amplitude the waveform is scaled to, so noise is not blown up to full height. */
export const WAVEFORM_MIN_AMPLITUDE = 1;
