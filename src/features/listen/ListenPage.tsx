import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { listenPath, planWithSoundPath } from '../../config/routes';
import { PageHeading } from '../../shared/PageHeading';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { SleepDimmer } from '../session/SleepDimmer';
import { ListenChoices } from './ListenChoices';
import { ListenPlayer } from './ListenPlayer';
import { soundsAsSaved } from './melody';
import { MelodyList } from './MelodyList';
import { MelodyQueue } from './MelodyQueue';
import { SaveMelodyDialog } from './SaveMelodyDialog';
import { useListening } from './listeningContext';
import { RESTART_INSTEAD_OF_PREVIOUS_S } from './useListeningState';
import '../plan/plan.css';
import './listen.css';

/** Choices and full player at /listen; their audio belongs to the provider above the routes. */
export function ListenPage(): React.JSX.Element {
  const { copy, tab, expanded, highlightedId, library, melodies, sound, level, durationMin,
    setLevel, setDurationMin, current, phase, positionS, savedMelody, queueIndex, playing, seeking,
    notice, saving, setSaving, shown, world, place, proposedName, creationMessage, sessionSound,
    openPlayer, closePlayer, createPiece, resume, restart, playMelody, seek, previous, next, changeSound,
    openSave, save, goToTab, removeMelody, pause, setControlsHost } = useListening();
  usePageTitle(tab === 'melodies' ? copy.melodiesPageTitle : copy.pageTitle);

  return (
    <div className={expanded ? 'listen-page is-player-open' : 'listen-page'}>
      <SleepDimmer active={playing && shown.initialLevel === 'sleep'} />
      <PageHeading eyebrow={copy.eyebrow} title={copy.pageTitle}>
        <p>{copy.introduction}</p>
      </PageHeading>

      <div className="listen-layout">
        <ListenPlayer
          onControlsHostChange={setControlsHost}
          phase={phase}
          title={current === null ? copy.player.label : savedMelody?.name ?? place}
          world={world}
          place={place}
          unsaved={current !== null && library.melodies !== null && savedMelody === null && phase !== 'ready' && !playing}
          level={shown.initialLevel}
          instrument={shown.instrument}
          ambience={shown.ambience}
          hasPiece={current !== null}
          positionS={positionS}
          lengthS={current?.lengthS ?? durationMin * SECONDS_PER_MINUTE}
          savedAtS={savedMelody?.positionS ?? null}
          seeking={seeking}
          saved={savedMelody !== null}
          olderSound={savedMelody !== null && !soundsAsSaved(savedMelody)}
          notice={notice}
          expanded={expanded}
          canPrevious={current !== null && (positionS > RESTART_INSTEAD_OF_PREVIOUS_S || queueIndex > 0)}
          canNext={queueIndex >= 0 && queueIndex < melodies.length - 1}
          queue={<MelodyQueue melodies={melodies} currentId={savedMelody?.id ?? null} onPlay={playMelody} />}
          onPause={pause}
          onResume={resume}
          onRestart={restart}
          onSeek={seek}
          onPrevious={previous}
          onNext={next}
          onExpand={openPlayer}
          onCollapse={closePlayer}
          onSave={openSave}
          onViewSaved={() => { goToTab('melodies', current?.melodyId ?? undefined); }}
        />

        <div className="listen-main">
          <nav className="listen-tabs" aria-label={copy.tabsLabel}>
            <Link to={listenPath('create')} replace aria-current={tab === 'create' ? 'page' : undefined}>{copy.tabs.create}</Link>
            <Link to={listenPath('melodies')} replace aria-current={tab === 'melodies' ? 'page' : undefined}>{copy.tabs.melodies(melodies.length)}</Link>
          </nav>

          {/* Keyed by the tab, so the new one fades in instead of replacing the last at once. */}
          <div key={tab} className="listen-tab-panel">
            {tab === 'create' ? (
              <ListenChoices sound={sound} level={level} onSoundChange={changeSound} onLevelChange={setLevel}
                durationMin={durationMin} onDurationChange={setDurationMin}
                onCreate={createPiece} creating={seeking} creationMessage={creationMessage} />
            ) : (
              <MelodyList
                melodies={melodies}
                cloud={library.cloud}
                pending={library.pending}
                failed={library.failed}
                playingId={playing || phase === 'paused' ? savedMelody?.id ?? null : null}
                paused={phase === 'paused'}
                highlightedId={highlightedId}
                onPlay={playMelody}
                onRename={(id, name) => { void library.rename(id, name); }}
                onDelete={removeMelody}
                onCreate={() => { goToTab('create'); }}
              />
            )}
          </div>

          <p className="listen-session-link">
            {copy.player.sessionQuestion}{' '}
            <Link to={planWithSoundPath(sessionSound)}>{copy.player.sessionAction}</Link>
          </p>
        </div>
      </div>

      {saving && <SaveMelodyDialog proposedName={proposedName} onSave={save} onCancel={() => { setSaving(false); }} />}
    </div>
  );
}
