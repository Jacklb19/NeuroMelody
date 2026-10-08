/**
 * Sections of the landing page whose items come from a list (ADR-25). The
 * ids order the items on screen; the dictionary words each one.
 */
export const LANDING_HIGHLIGHT_IDS = ['generative', 'listening', 'gradual'] as const;

/** The real order of the control loop: signal → analysis → state → music (ADR-19). */
export const LANDING_STEP_IDS = ['signal', 'analysis', 'state', 'music'] as const;

export const LANDING_PRIVACY_IDS = ['local', 'camera', 'account'] as const;

export const LANDING_TECHNOLOGY_IDS = ['pwa', 'audio', 'worker', 'bluetooth'] as const;

/** Anchors of the in-page navigation; also the ids of the sections. */
export const LANDING_SECTIONS = {
  howItWorks: 'how-it-works',
  sources: 'sources',
  privacy: 'privacy',
  technology: 'technology',
} as const;
