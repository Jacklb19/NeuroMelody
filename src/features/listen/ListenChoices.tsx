import { useId } from 'react';
import { useMessages } from '../../i18n/messages';
import { AMBIENCE_IDS, type AmbienceId } from '../audio/core/ambienceCatalog';
import { INSTRUMENT_IDS, type InstrumentId } from '../audio/core/instrumentCatalog';
import { LEVELS, type LevelId } from '../audio/engine/levels';
import { isSoundProfile, SOUND_PROFILES } from '../audio/engine/soundProfile';
import { AmbienceIcon } from '../plan/AmbienceIcon';
import { InstrumentIcon } from '../plan/InstrumentIcon';
import { WORLD_IDS, WORLDS, worldOf, type SoundChoices, type WorldId } from '../plan/worldCatalog';
import { LISTEN_LEVELS } from './listenCatalog';

interface ListenChoicesProps {
  readonly sound: SoundChoices;
  readonly level: LevelId;
  readonly onSoundChange: (sound: SoundChoices) => void;
  readonly onLevelChange: (level: LevelId) => void;
}

/**
 * The create tab of the listening screen (P-17): what will sound when the
 * person presses play or asks for a new piece. The world comes first, as in
 * the plan (ADR-64); the step stays put while the piece plays, and the
 * separate sound choices are folded below.
 */
export function ListenChoices({ sound, level, onSoundChange, onLevelChange }: ListenChoicesProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.listen.create;
  const world = worldOf(sound);
  const worldNames: Readonly<Record<WorldId, string>> = t.plan.worlds.names;
  const worldDescriptions: Readonly<Record<WorldId, string>> = t.plan.worlds.descriptions;
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const instrumentNames: Readonly<Record<InstrumentId, string>> = t.plan.instrument.names;
  const ambienceNames: Readonly<Record<AmbienceId, string>> = t.plan.ambience.names;
  const ids = { worlds: useId(), levels: useId(), adjust: useId() };

  return (
    <div className="listen-choices">
      <fieldset className="plan-fieldset" aria-describedby={ids.worlds}>
        <legend><span className="plan-step-number" aria-hidden="true">01</span>{copy.worldLegend}</legend>
        <p id={ids.worlds} className="secondary-text">{copy.worldHint}</p>
        <div className="world-options">
          {WORLD_IDS.map((id) => (
            <label key={id} className="choice-card world-option">
              <input
                type="radio"
                name="listen-world"
                value={id}
                aria-label={worldNames[id]}
                aria-describedby={`${ids.worlds}-${id}`}
                checked={world === id}
                onChange={() => { onSoundChange(WORLDS[id]); }}
              />
              <span className="world-swatch" data-world={id} aria-hidden="true" />
              <span className="world-text">
                <strong>{worldNames[id]}</strong>
                <span id={`${ids.worlds}-${id}`} className="secondary-text">{worldDescriptions[id]}</span>
              </span>
            </label>
          ))}
        </div>
        {world === null && <p className="secondary-text world-custom" role="status">{t.plan.worlds.custom}</p>}
      </fieldset>

      <fieldset className="plan-fieldset" aria-describedby={ids.levels}>
        <legend><span className="plan-step-number" aria-hidden="true">02</span>{copy.levelLegend}</legend>
        <p id={ids.levels} className="secondary-text">{copy.levelHint}</p>
        <div className="listen-levels">
          {LISTEN_LEVELS.map((id) => (
            <label key={id} className="choice-card listen-level">
              <input
                type="radio"
                name="listen-level"
                value={id}
                aria-describedby={`${ids.levels}-${id}`}
                checked={level === id}
                onChange={() => { onLevelChange(id); }}
              />
              <strong>{levelNames[id]}</strong>
              <span id={`${ids.levels}-${id}`} className="secondary-text">{copy.levelTempo(LEVELS[id].tempo)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <details className="glass-card listen-adjust">
        <summary>
          <span className="listen-adjust-title">{copy.adjust}</span>
          <span className="secondary-text">{copy.adjustHint}</span>
        </summary>
        <div className="listen-adjust-body">
          <fieldset className="plan-fieldset">
            <legend>{t.plan.instrument.legend}</legend>
            <div className="ambience-options instrument-options" style={{ '--option-count': INSTRUMENT_IDS.length } as React.CSSProperties}>
              {INSTRUMENT_IDS.map((id) => (
                <label key={id} className="choice-card ambience-option">
                  <input type="radio" name="listen-instrument" value={id} checked={sound.instrument === id}
                    onChange={() => { onSoundChange({ ...sound, instrument: id }); }} />
                  <span className="icon-badge"><InstrumentIcon instrument={id} /></span>
                  <span>{instrumentNames[id]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="plan-fieldset">
            <legend>{t.plan.ambience.legend}</legend>
            <div className="ambience-options" style={{ '--option-count': AMBIENCE_IDS.length } as React.CSSProperties}>
              {AMBIENCE_IDS.map((id) => (
                <label key={id} className="choice-card ambience-option">
                  <input type="radio" name="listen-ambience" value={id} checked={sound.ambience === id}
                    onChange={() => { onSoundChange({ ...sound, ambience: id }); }} />
                  <span className="icon-badge"><AmbienceIcon ambience={id} /></span>
                  <span>{ambienceNames[id]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="listen-profile" htmlFor={ids.adjust}>
            {t.listeningTools.profile}
            <select id={ids.adjust} className="tool-input" value={sound.profile} onChange={(event) => {
              if (isSoundProfile(event.target.value)) onSoundChange({ ...sound, profile: event.target.value });
            }}>
              {SOUND_PROFILES.map((id) => <option key={id} value={id}>{t.listeningTools.profiles[id]}</option>)}
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}
