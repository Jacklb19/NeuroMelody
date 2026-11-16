import { useLocation } from 'react-router';
import { ROUTES } from '../../config/routes';
import { BreathingOrb } from '../../shared/BreathingOrb';
import { PlayerPauseIcon, PlayIcon } from '../../shared/icons';
import { useListening } from './listeningContext';
import './listen.css';

/** The same piece is reachable from every app screen, including while it waits paused. */
export function ListeningBar(): React.JSX.Element | null {
  const player = useListening();
  const { pathname } = useLocation();
  if (pathname === ROUTES.listen || player.exclusive || player.current === null || player.phase === 'ready') return null;
  const copy = player.copy.player;
  const title = player.savedMelody?.name ?? player.place;
  const share = player.positionS / player.current.lengthS;
  const label = player.playing ? copy.pause : player.phase === 'ended' ? copy.restart : copy.resume;
  const action = player.playing ? player.pause : player.phase === 'ended' ? player.restart : player.resume;
  return (
    <aside className="listening-bar" aria-label={copy.label} data-phase={player.phase} data-world={player.world ?? undefined}>
      <div className="player-mini" style={{ '--seek-share': share } as React.CSSProperties}>
        <span className="player-mini-line" aria-hidden="true" />
        <button type="button" className="player-mini-open" onClick={player.openPlayer} aria-label={copy.expand}>
          <BreathingOrb className="player-mini-orb" />
          <span className="player-mini-text"><strong>{title}</strong><span className="secondary-text">{copy.phases[player.phase]}</span></span>
        </button>
        <button type="button" className="player-primary is-compact" aria-label={label} disabled={player.seeking} onClick={action} data-playing={player.playing || undefined}>
          <span className="player-primary-icon" aria-hidden="true">{player.playing ? <PlayerPauseIcon /> : <PlayIcon />}</span>
        </button>
      </div>
    </aside>
  );
}
