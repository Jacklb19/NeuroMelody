/**
 * Tunable values of the landing page (ADR-25, ADR-28). Visual values (colours,
 * sizes, timings of CSS motion) live in index.css; these are the ones the
 * scripts need.
 */

/** The simulated heart behind the hero: a resting rhythm with breathing-driven variability. */
export const HERO_HEART = {
  /** Mean interval between beats, in ms (about 65 bpm). */
  meanRrMs: 920,
  /** One breath cycle, in ms: intervals lengthen on the out-breath. */
  breathingPeriodMs: 5500,
  /** How far breathing moves the interval either side of the mean, in ms. */
  breathingDepthMs: 45,
  /** Random spread added to every interval, in ms. */
  jitterMs: 18,
  /** Fixed seed: the page shows the same heart on every visit. */
  seed: 7,
} as const;

/** How often the sample readout under the hero refreshes, in ms. */
export const SAMPLE_REFRESH_MS = 1000;

/** Beats the sample readout uses for its variability figure. */
export const SAMPLE_WINDOW_BEATS = 30;

/** Beats the simulator keeps; older ones are dropped so memory stays flat. */
export const SIMULATOR_HISTORY_BEATS = 64;

/** 3D scene of the hero. */
export const HERO_SCENE = {
  /** Points on the sphere. */
  particleCount: 5200,
  /** Lines of the musical staff that orbits the sphere. */
  staffLines: 5,
  /** Radius of the staff around the unit sphere. */
  staffRadius: 1.42,
  /** Vertical gap between two staff lines. */
  staffGap: 0.055,
  /** Segments of each staff circle. */
  staffSegments: 160,
  /** Notes that travel along the staff; one lights up on each beat. */
  noteCount: 14,
  /** Turns per second of the whole figure while idle. */
  spinPerSecond: 0.035,
  /** How far the figure leans toward the pointer, in radians. */
  pointerTilt: 0.35,
  /** Share of the remaining distance the tilt covers each frame (0–1). */
  pointerEasing: 0.05,
  /** Base size of a point, in pixels at device pixel ratio 1. */
  pointSize: 7,
  /** Camera distance from the centre. */
  cameraDistance: 5,
  /** Field of view of the camera, in degrees. */
  fieldOfView: 40,
  /** Upper bound on the device pixel ratio, so large screens stay smooth. */
  maxPixelRatio: 2,
} as const;
