/**
 * The logo: a heartbeat that turns into a sound wave and calms down, inside
 * the ring of the orb. It draws in the current text colour, so each screen
 * decides its tone.
 */
export function BrandMark(): React.JSX.Element {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
      <path d="M6 16h3.5l2-6 3 12 2-6c1.5-4 3.2-4 4.7 0s2.8 2.8 4.3 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
