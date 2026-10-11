import { useEffect, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { SAMPLE_REFRESH_MS, SAMPLE_WINDOW_BEATS } from './config';
import type { HeartbeatSimulator, HeartReading } from './heartbeatSimulator';
import { LivePulse } from './LivePulse';

const EMPTY: HeartReading = { heartRate: null, rmssd: null, lastRrMs: null };

/**
 * Figures of the simulated heart under the hero, so the visitor sees the kind
 * of numbers the app works with. Labelled as a simulation and kept out of
 * live regions: it is an illustration, not a reading.
 */
export function SampleReadout({ heart }: { readonly heart: HeartbeatSimulator }): React.JSX.Element {
  const t = useMessages();
  const [reading, setReading] = useState<HeartReading>(EMPTY);

  useEffect(() => {
    const origin = performance.now();
    const refresh = (): void => { setReading(heart.readingAt(performance.now() - origin, SAMPLE_WINDOW_BEATS)); };
    const timer = window.setInterval(refresh, SAMPLE_REFRESH_MS);
    return () => { window.clearInterval(timer); };
  }, [heart]);

  const { sample } = t.landing;
  const { units, withUnit, noValue } = t.common;
  const figure = (value: number | null, unit: string): string =>
    value === null ? noValue : withUnit(String(Math.round(value)), unit);

  return (
    <div className="sample-readout">
      <p className="sample-tag"><span className="sample-dot" aria-hidden="true" />{sample.label}</p>
      <LivePulse heart={heart} />
      <dl aria-label={sample.label}>
        <div><dt>{sample.heartRate}</dt><dd>{figure(reading.heartRate, units.beatsPerMinute)}</dd></div>
        <div><dt>{sample.rmssd}</dt><dd>{figure(reading.rmssd, units.milliseconds)}</dd></div>
        <div><dt>{sample.lastBeat}</dt><dd>{figure(reading.lastRrMs, units.milliseconds)}</dd></div>
      </dl>
    </div>
  );
}
