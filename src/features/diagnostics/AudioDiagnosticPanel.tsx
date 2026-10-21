import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import { downloadText } from '../../shared/downloadText';
import { parseOption } from '../../shared/parseOption';
import { MS_PER_SECOND } from '../../shared/time';
import { AMBIENCE_IDS, type AmbienceId } from '../audio/core/ambienceCatalog';
import { INSTRUMENT_IDS, type InstrumentId } from '../audio/core/instrumentCatalog';
import type { AudioEngine, AudioFactory } from '../audio/engine/AudioEngine';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { readAmbience, readInstrument } from '../plan/soundChoices';
import { useWarningsRegistry } from '../warnings/warningsContext';
import {
  AUDIO_LATENCY_IDS, AUDIO_OUTPUT_IDS, AUDIO_PROBE_MINUTES, AUDIO_REVERB_IDS, AUDIO_TRACE_FILE, AUDIO_TRACE_PERIOD_MS,
  AudioTrace, type AudioLatencyId, type AudioOutputId, type AudioReverbId, type AudioTraceEntry, type AudioTraceReason,
} from './audioTrace';
import './audioDiagnostic.css';

const PERCENT = 100;

/** A short, local comparison of output routes before testing a physical phone lock. */
export function AudioDiagnosticPanel(): React.JSX.Element {
  const t = useMessages();
  const copy = t.diagnostics.audio;
  const format = useFormatters();
  const titleId = useId();
  const registry = useWarningsRegistry();
  const [accepted, setAccepted] = useState(() => registry.isAccepted());
  const [checked, setChecked] = useState(false);
  const [output, setOutput] = useState<AudioOutputId>('direct');
  const [latencyHint, setLatencyHint] = useState<AudioLatencyId>(AUDIO_LATENCY_IDS[0]);
  const [reverb, setReverb] = useState<AudioReverbId>(AUDIO_REVERB_IDS[0]);
  // The default latency keeps the sessions' own factory; any other is built on demand, only here.
  const [loaded, setLoaded] = useState<{ readonly latency: AudioLatencyId; readonly factory: AudioFactory } | null>(null);
  const factory = latencyHint !== AUDIO_LATENCY_IDS[0] && loaded?.latency === latencyHint ? loaded.factory : undefined;
  const [instrument, setInstrument] = useState<InstrumentId>(() => readInstrument(null));
  const [ambience, setAmbience] = useState<AmbienceId>(() => readAmbience(null));
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const [trace] = useState(() => new AudioTrace());
  const [latest, setLatest] = useState<AudioTraceEntry | null>(null);

  const capture = useCallback((reason: AudioTraceReason): void => {
    const current = engineRef.current;
    if (current === null) return;
    setLatest(trace.capture(reason, document.visibilityState, current.diagnostic()));
  }, [trace]);

  const onEngineChange = useCallback((next: AudioEngine | null): void => {
    if (next === engineRef.current) return;
    if (next === null) {
      capture('stopped');
    } else {
      trace.begin({ output, latency: latencyHint, reverb, instrument, ambience, userAgent: navigator.userAgent, processors: navigator.hardwareConcurrency || null });
      setLatest(null);
    }
    engineRef.current = next;
    setEngine(next);
  }, [ambience, capture, instrument, latencyHint, output, reverb, trace]);

  useEffect(() => {
    if (latencyHint === AUDIO_LATENCY_IDS[0]) return undefined;
    let cancelled = false;
    void import('../audio/engine/browserFactory').then((module) => {
      if (!cancelled) setLoaded({ latency: latencyHint, factory: module.createBrowserFactory(latencyHint) });
    });
    return () => { cancelled = true; };
  }, [latencyHint]);

  useEffect(() => {
    if (engine === null) return undefined;
    capture('started');
    const unsubscribe = engine.subscribeContextState(() => { capture('context'); });
    const visibilityChanged = (): void => { capture(document.hidden ? 'hidden' : 'visible'); };
    // Page lifecycle: a frozen page runs no code at all, which a visibility change alone does not tell.
    const frozen = (): void => { capture('frozen'); };
    const resumed = (): void => { capture('resumed'); };
    const hidden = (): void => { capture('pagehide'); };
    const shown = (): void => { capture('pageshow'); };
    document.addEventListener('visibilitychange', visibilityChanged);
    document.addEventListener('freeze', frozen);
    document.addEventListener('resume', resumed);
    window.addEventListener('pagehide', hidden);
    window.addEventListener('pageshow', shown);
    const timer = window.setInterval(() => { capture('sample'); }, AUDIO_TRACE_PERIOD_MS);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', visibilityChanged);
      document.removeEventListener('freeze', frozen);
      document.removeEventListener('resume', resumed);
      window.removeEventListener('pagehide', hidden);
      window.removeEventListener('pageshow', shown);
      window.clearInterval(timer);
    };
  }, [capture, engine]);

  const number = (value: number | null | undefined): string => value === null || value === undefined ? copy.unavailable : format.integer(value);
  const latency = (value: number | null | undefined): string => number(value === null || value === undefined ? null : value * MS_PER_SECOND);
  const contextNames: Readonly<Record<AudioContextState, string>> = copy.contextStates;
  const pace = (ratio: number | null): string => ratio === null ? copy.unavailable : copy.pace(format.decimal(ratio * PERCENT, 1));
  const clock = latest === null ? null : trace.clock;
  const waitingForFactory = latencyHint !== AUDIO_LATENCY_IDS[0] && factory === undefined;

  return (
    <section className="audio-diagnostic" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.title}</h2>
      <p>{copy.introduction(AUDIO_PROBE_MINUTES)}</p>
      <ol className="audio-probe-steps">{copy.steps.map(step => <li key={step}>{step}</li>)}</ol>
      {!accepted ? (
        <div className="audio-probe-warnings">
          <h3>{t.warnings.pageTitle}</h3>
          <ul>{t.warnings.items.map(item => <li key={item}>{item}</li>)}</ul>
          <p>{t.warnings.stopHint(t.audio.playback.stop, t.warnings.keyNames.Escape)}</p>
          <label className="confirmation-control">
            <input type="checkbox" checked={checked} onChange={event => { setChecked(event.target.checked); }} />
            <span>{t.warnings.confirmation}</span>
          </label>
          <button type="button" className="button button-primary" disabled={!checked} onClick={() => { registry.accept(new Date()); setAccepted(true); }}>{t.warnings.accept}</button>
        </div>
      ) : (
        <>
          <fieldset className="audio-probe-options" disabled={engine !== null}>
            <legend>{copy.settings}</legend>
            <div className="source-controls">
              <label>{copy.output}<select value={output} onChange={event => { setOutput(parseOption(AUDIO_OUTPUT_IDS, event.target.value, 'direct')); }}>
                {AUDIO_OUTPUT_IDS.map(id => <option key={id} value={id}>{copy.outputs[id]}</option>)}
              </select></label>
              <label>{copy.reverb}<select value={reverb} onChange={event => { setReverb(parseOption(AUDIO_REVERB_IDS, event.target.value, AUDIO_REVERB_IDS[0])); }}>
                {AUDIO_REVERB_IDS.map(id => <option key={id} value={id}>{copy.reverbs[id]}</option>)}
              </select></label>
              <label>{copy.latency}<select value={latencyHint} onChange={event => { setLatencyHint(parseOption(AUDIO_LATENCY_IDS, event.target.value, AUDIO_LATENCY_IDS[0])); }}>
                {AUDIO_LATENCY_IDS.map(id => <option key={id} value={id}>{copy.latencies[id]}</option>)}
              </select></label>
              <label>{t.plan.instrument.legend}<select value={instrument} onChange={event => { setInstrument(parseOption(INSTRUMENT_IDS, event.target.value, INSTRUMENT_IDS[0])); }}>
                {INSTRUMENT_IDS.map(id => <option key={id} value={id}>{t.plan.instrument.names[id]}</option>)}
              </select></label>
              <label>{t.plan.ambience.legend}<select value={ambience} onChange={event => { setAmbience(parseOption(AMBIENCE_IDS, event.target.value, AMBIENCE_IDS[0])); }}>
                {AMBIENCE_IDS.map(id => <option key={id} value={id}>{t.plan.ambience.names[id]}</option>)}
              </select></label>
            </div>
          </fieldset>
          {waitingForFactory ? <p className="secondary-text">{copy.preparing}</p> : (
            <PlaybackPanel key={`${output}-${latencyHint}-${reverb}-${instrument}-${ambience}`} durationMin={AUDIO_PROBE_MINUTES} quietEnding factory={factory}
              outputThroughAudioElement={output === 'media'} reverb={reverb === 'on'} instrument={instrument} ambience={ambience} onEngineChange={onEngineChange} />
          )}
          {latest !== null && (
            <dl className="source-metrics">
              <dt>{copy.context}</dt><dd>{contextNames[latest.contextState]}</dd>
              <dt>{copy.time}</dt><dd>{number(latest.audioTimeS)}</dd>
              <dt>{copy.underruns}</dt><dd>{number(latest.playback?.underruns)}</dd>
              <dt>{copy.baseLatency}</dt><dd>{latency(latest.baseLatencyS)}</dd>
              <dt>{copy.outputLatency}</dt><dd>{latency(latest.outputLatencyS)}</dd>
              <dt>{copy.paceVisible}</dt><dd>{pace(clock?.visible.ratio ?? null)}</dd>
              <dt>{copy.paceHidden}</dt><dd>{pace(clock?.hidden.ratio ?? null)}</dd>
              <dt>{copy.slowestHidden}</dt><dd>{pace(clock?.hidden.slowest ?? null)}</dd>
              <dt>{copy.entries}</dt><dd>{number(trace.length)}</dd>
            </dl>
          )}
          <p className="secondary-text">{output === 'media' ? copy.mediaCaveat : copy.directCaveat}</p>
          <button type="button" className="button button-secondary" disabled={latest === null} onClick={() => {
            capture('sample');
            downloadText(AUDIO_TRACE_FILE, trace.serialize(), 'application/json');
          }}>{copy.download}</button>
        </>
      )}
      <p className="secondary-text">{copy.privacy}</p>
    </section>
  );
}
