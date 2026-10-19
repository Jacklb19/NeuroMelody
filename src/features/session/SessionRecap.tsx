import { useId, useSyncExternalStore } from 'react';
import type { AdaptationSession } from '../adaptation/AdaptationSession';
import { MusicRecapView } from './MusicRecapView';

/**
 * What the music did in the session that just ended (ADR-42), under the
 * stage of the session. The same story is kept with the session and shown in
 * its summary.
 */
export function SessionRecap({ session, playing }: { readonly session: AdaptationSession; readonly playing: boolean }): React.JSX.Element | null {
  const { recap } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const titleId = useId();
  if (playing || recap === null || recap.startTempoBpm === null) {
    return null;
  }
  return (
    <section className="session-recap" aria-labelledby={titleId}>
      <MusicRecapView recap={recap} titleId={titleId} headingLevel={3} />
    </section>
  );
}
