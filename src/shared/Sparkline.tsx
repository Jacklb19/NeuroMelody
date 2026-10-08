import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklinePath } from './sparklinePath';

interface SparklineProps {
  readonly values: readonly (number | null)[];
  /** Text alternative that states what the line shows. */
  readonly label: string;
}

/** Small trend line; the figures it summarises are always shown as text too. */
export function Sparkline({ values, label }: SparklineProps): React.JSX.Element | null {
  const path = sparklinePath(values);
  if (path === '') return null;
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${String(SPARKLINE_WIDTH)} ${String(SPARKLINE_HEIGHT)}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path d={path} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
