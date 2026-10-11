/** Staff lines of the drawing, top to bottom, and where each note sits: [x, line index]. */
const STAFF_TOP = 40;
const STAFF_GAP = 20;
const STAFF_LINES = [0, 1, 2, 3, 4];
const NOTES: readonly (readonly [number, number])[] = [
  [700, 3], [770, 2], [840, 3.500], [910, 1.500], [980, 2.500], [1050, 1], [1120, 2],
];

/**
 * The idea of the app in one stroke: a heartbeat trace that runs into a
 * musical staff and leaves notes on it. It draws itself when it scrolls
 * into view (landing.css); with reduced motion it is simply there.
 */
export function PulseToMelody({ label }: { readonly label: string }): React.JSX.Element {
  return (
    <svg className="pulse-to-melody" viewBox="0 0 1200 160" role="img" aria-label={label} data-reveal>
      {STAFF_LINES.map((line) => (
        <line key={line} className="ptm-staff" x1="620" x2="1190" y1={STAFF_TOP + line * STAFF_GAP} y2={STAFF_TOP + line * STAFF_GAP} />
      ))}
      <path
        className="ptm-trace"
        pathLength={1}
        d="M10 80 H150 l14 -8 l12 8 l12 -52 l18 96 l14 -44 H330 l14 -8 l12 8 l12 -52 l18 96 l14 -44 H500 c40 0 50 -24 80 -24 s40 24 80 24"
      />
      {NOTES.map(([x, line], index) => (
        <ellipse
          key={x}
          className="ptm-note"
          cx={x}
          cy={STAFF_TOP + line * STAFF_GAP}
          rx="11"
          ry="8"
          transform={`rotate(-20 ${String(x)} ${String(STAFF_TOP + line * STAFF_GAP)})`}
          style={{ '--note-index': index } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}
