import { useId } from 'react';
import { useMessages } from '../../i18n/messages';
import type { SessionSummary, SignalPhase } from '../records/summarizeSession';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { PHASE_DISPLAY_ORDER } from './phaseDisplayOrder';

/**
 * Share of signal time spent in each estimated state. The bar is a visual
 * aid; the list next to it carries the same figures as text.
 */
export function StateTimeShare({ secondsByState }: Pick<SessionSummary, 'secondsByState'>): React.JSX.Element {
  const t = useMessages();
  const format = useRecordFormatter();
  const titleId = useId();
  const { stateShare } = t.summary;
  // Typed by phase, so a phase without a name is a compile error.
  const labels: Readonly<Record<SignalPhase, string>> = stateShare.phases;
  const total = PHASE_DISPLAY_ORDER.reduce((sum, phase) => sum + secondsByState[phase], 0);
  return (
    <section aria-labelledby={titleId} className="state-share">
      <h2 id={titleId}>{stateShare.title}</h2>
      {total === 0 ? (
        <p className="secondary-text">{stateShare.empty}</p>
      ) : (
        <>
          <div className="state-bar" aria-hidden="true">
            {PHASE_DISPLAY_ORDER.filter((phase) => secondsByState[phase] > 0).map((phase) => (
              <span key={phase} className={`state-segment state-${phase}`} style={{ flexGrow: secondsByState[phase] }} />
            ))}
          </div>
          <ul className="state-legend">
            {PHASE_DISPLAY_ORDER.map((phase) => (
              <li key={phase}>
                <span className={`state-swatch state-${phase}`} aria-hidden="true" />
                {labels[phase]}
                <strong>{format.signalTime(secondsByState[phase])}</strong>
              </li>
            ))}
          </ul>
          <p className="panel-footnote">{stateShare.footnote}</p>
        </>
      )}
    </section>
  );
}
