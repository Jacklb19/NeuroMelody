import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { useMessages } from '../../i18n/messages';
import { formatClock } from '../../shared/formatClock';
import type { SignalSource } from '../acquisition/contract';
import type { AdaptationSession } from '../adaptation/AdaptationSession';
import { PulseTraceBuffer, pulseTracePath, referenceProgress, type PulsePoint } from './beatTrace';

/** Box the line is drawn in; the SVG stretches it to the width of its card. */
const CHART_WIDTH = 300;
const CHART_HEIGHT = 80;

interface PulseTraceProps {
  readonly source: SignalSource | null;
  readonly session: AdaptationSession;
  /** Whether to show the pulse figure; the arrival slide already shows it, large. */
  readonly showRate?: boolean;
  /** Opens the technical details, where the full signal and its figures are. */
  readonly onShowDetails: () => void;
}

interface TraceView {
  /** The source the line was drawn from: a line of another source is never shown. */
  readonly source: SignalSource | null;
  readonly points: readonly PulsePoint[];
  readonly heartRate: number | null;
}

const NO_VIEW: TraceView = { source: null, points: [], heartRate: null };

/**
 * The pulse beat by beat over the last minute and how far the baseline has
 * come (P-17). It follows the source on the main thread, like the arrival
 * figure; the analysis keeps running in its Worker. Once the baseline is
 * ready the card becomes lower. It describes; it never says whether a pulse
 * is good or bad.
 */
export function PulseTrace({ source, session, showRate = true, onShowDetails }: PulseTraceProps): React.JSX.Element | null {
  const t = useMessages();
  const copy = t.session.pulseTrace;
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [stored, setView] = useState<TraceView>(NO_VIEW);
  const view = stored.source === source ? stored : NO_VIEW;
  const titleId = useId();

  useEffect(() => {
    if (source === null) return undefined;
    const trace = new PulseTraceBuffer();
    return source.subscribe({
      onNotification: (notification) => {
        const changed = trace.push(notification);
        const heartRate = notification.sensorContact === false ? null : notification.heartRate;
        setView((current) => changed || current.source !== source || current.heartRate !== heartRate
          ? { source, points: trace.points, heartRate }
          : current);
      },
      // A source that connects again counts its signal time from 0: the old line would not fit it.
      onStateChange: (state) => {
        if (state !== 'connecting') return;
        trace.clear();
        setView({ source, points: [], heartRate: null });
      },
    });
  }, [source]);

  if (source === null) return null;
  const progress = referenceProgress(snapshot);
  const path = pulseTracePath(view.points, CHART_WIDTH, CHART_HEIGHT);
  const ready = session.fixed ? copy.referenceReadyFixed : copy.referenceReady;

  return (
    <section className={progress.done ? 'pulse-trace is-compact' : 'pulse-trace'} aria-labelledby={titleId}>
      <div className="pulse-trace-head">
        <h3 id={titleId} className="pulse-trace-title">{copy.title}</h3>
        {showRate && view.heartRate !== null && (
          <p className="pulse-trace-rate"><strong>{Math.round(view.heartRate)}</strong> {t.common.units.beatsPerMinute}</p>
        )}
      </div>
      {path === '' ? (
        <p className="pulse-trace-waiting">{copy.waiting}</p>
      ) : (
        <svg
          className="pulse-trace-chart"
          viewBox={`0 0 ${String(CHART_WIDTH)} ${String(CHART_HEIGHT)}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={copy.chartLabel}
        >
          <path d={path} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {progress.done ? (
        <p className="pulse-trace-reference">{ready}</p>
      ) : (
        <div className="pulse-trace-reference">
          <p>{copy.reference(formatClock(progress.elapsedS), formatClock(progress.totalS), progress.readings, progress.minReadings)}</p>
          <progress className="pulse-trace-progress" max={1} value={progress.share} aria-label={copy.progressLabel} />
          <p className="pulse-trace-hint">{copy.referenceHint}</p>
        </div>
      )}
      {/* Said once when the reference starts and once when it is ready, never at every reading. */}
      <p className="visually-hidden" role="status">{progress.done ? ready : copy.referenceStarted}</p>
      <button type="button" className="text-button pulse-trace-details" onClick={onShowDetails}>{copy.showDetails}</button>
    </section>
  );
}
