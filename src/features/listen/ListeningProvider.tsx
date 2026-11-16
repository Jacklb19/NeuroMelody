import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../account/authContext';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { forgetLastPiece } from './lastPiece';
import { ListeningContext } from './listeningContext';
import { RESTART_INSTEAD_OF_PREVIOUS_S, useListeningState } from './useListeningState';
import { ListeningBar } from './ListeningBar';

/** One player per signed-in account, outside route views and their loading boundaries. */
export function ListeningProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { state } = useAuth();
  const owner = state.kind === 'signed_in' ? state.user.id : null;
  return <ListeningSession key={owner ?? 'signed-out'} owner={owner}>{children}</ListeningSession>;
}

function ListeningSession({ owner, children }: { readonly owner: string | null; readonly children: ReactNode }): React.JSX.Element {
  const player = useListeningState();
  const { current, shown, controlsHost, exclusive, playbackRef, savedMelody, place } = player;
  // Logout, deletion or account replacement also forgets the tab's recoverable piece.
  useEffect(() => () => { if (owner !== null) forgetLastPiece(owner); }, [owner]);
  return (
    <ListeningContext value={player}>
      {children}
      <ListeningBar />
      {owner !== null && !exclusive && (current !== null || controlsHost !== null) && (
        <div hidden={controlsHost === null} className="listening-audio-host">
          <PlaybackPanel ref={playbackRef} controlsHost={controlsHost}
            durationMin={current === null ? player.durationMin : current.lengthS / 60}
            initialLevel={shown.initialLevel} instrument={shown.instrument} ambience={shown.ambience} profile={shown.profile}
            quietEnding hideStart onEngineChange={player.onEngineChange} onElapsedChange={player.setElapsedS}
            onFinished={player.finish} onMixChange={player.changeMix}
            media={{ title: savedMelody?.name ?? place, album: place, onPlay: player.phase === 'ended' ? player.restart : player.resume,
              onPrevious: current !== null && (player.positionS > RESTART_INSTEAD_OF_PREVIOUS_S || player.queueIndex > 0) ? player.previous : undefined,
              onNext: player.queueIndex >= 0 && player.queueIndex < player.melodies.length - 1 ? player.next : undefined }} />
        </div>
      )}
    </ListeningContext>
  );
}
