import { useId, useSyncExternalStore } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import { modeName } from '../audio/core/theory';
import { LEVELS } from '../audio/engine/levels';
import type { AdaptationSession } from './AdaptationSession';

/**
 * Scheduled musical parameters (RF-09, RF-12), shown among the technical
 * details of /session. The estimated state itself lives in the simple view.
 */
export function MusicalStatePanel({ session }: { readonly session: AdaptationSession }): React.JSX.Element {
  const t = useMessages();
  const format = useFormatters();
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const title = useId();
  const level = LEVELS[state.level];
  const copy = t.adaptation.musicalState;
  const bpm = (tempo: number): string => t.common.withUnit(format.integer(tempo), t.common.units.tempo);
  return <section aria-labelledby={title} className="musical-state-panel">
    <h2 id={title}>{copy.title}</h2>
    <dl className="music-metrics">
      <div className="music-level"><dt>{copy.level}</dt><dd data-testid="music-level">{t.audio.levels[state.level]}</dd></div>
      <div className="tempo-metric"><dt>{copy.currentTempo}</dt><dd>{state.tempoBpm === null ? t.common.noValue : bpm(state.tempoBpm)}</dd></div>
      <div><dt>{copy.targetTempo}</dt><dd>{bpm(level.tempo)}</dd></div>
      <div><dt>{copy.scheduledMode}</dt><dd>{t.audio.modes[modeName(level.mode)]}</dd></div>
      <div><dt>{copy.scheduledLayers}</dt><dd>{level.layers}</dd></div>
    </dl>
    <p className="panel-footnote">
      {copy.footnote}
    </p>
  </section>;
}
