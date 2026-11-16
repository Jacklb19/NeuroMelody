import { useMessages } from '../../i18n/messages';
import { formatClock } from '../../shared/formatClock';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import type { LevelId } from '../audio/engine/levels';

/** A change of step of the music, at its second of music (ADR-67). */
export interface ProgressChapter {
  readonly atS: number;
  readonly level: LevelId;
}

interface SessionProgressProps {
  /** Listening time measured on the audio clock, in seconds. */
  readonly elapsedS: number;
  readonly plannedS: number;
  /**
   * The steps of the music in order, the first one where it started: each
   * later one is a mark on the staff, and the last one names the chapter the
   * session is in. The bar cannot be moved: the music follows the pulse now.
   */
  readonly chapters?: readonly ProgressChapter[];
}

/**
 * Session progress drawn as a musical staff that fills with ink while the
 * session advances. It is the signature element of the listening screen;
 * the text next to it carries the same information for everyone. Where the
 * music changed its step there is a mark, like the chapters of a player.
 */
export function SessionProgress({ elapsedS, plannedS, chapters = [] }: SessionProgressProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.session.progress;
  const levelNames: Readonly<Record<LevelId, string>> = t.session.journey.levels;
  const shownS = Math.min(elapsedS, plannedS);
  const fraction = plannedS > 0 ? shownS / plannedS : 0;
  const plannedMin = Math.round(plannedS / SECONDS_PER_MINUTE);
  const elapsedMin = Math.floor(shownS / SECONDS_PER_MINUTE);
  const extraS = Math.max(0, elapsedS - plannedS);
  const current = chapters.at(-1);
  const marks = chapters.slice(1).filter((chapter) => chapter.atS > 0 && chapter.atS < plannedS);

  return (
    <div className="session-progress">
      <div
        className="staff"
        role="progressbar"
        aria-label={copy.label}
        aria-valuemin={0}
        aria-valuemax={plannedS}
        aria-valuenow={Math.round(shownS)}
        aria-valuetext={copy.valueText(elapsedMin, plannedMin)}
        style={{ '--progress': fraction } as React.CSSProperties}
      >
        <span className="staff-ink" aria-hidden="true" />
        {marks.map((chapter) => (
          <span key={chapter.atS} className="staff-chapter" aria-hidden="true" data-level={chapter.level}
            title={copy.chapterMark(levelNames[chapter.level], formatClock(chapter.atS))}
            style={{ '--chapter-at': chapter.atS / plannedS } as React.CSSProperties} />
        ))}
        <span className="staff-note" aria-hidden="true" />
      </div>
      <p className="session-clock">
        {copy.clock(<span key="elapsed">{formatClock(shownS)}</span>, formatClock(plannedS))}
        {extraS > 0 && <span className="session-extra">{copy.extra(formatClock(extraS))}</span>}
        {current !== undefined && chapters.length > 1 && (
          <span className="session-chapter">{copy.chapter(levelNames[current.level], formatClock(current.atS))}</span>
        )}
      </p>
      {marks.length > 0 && (
        <ul className="visually-hidden" aria-label={copy.chaptersLabel}>
          {marks.map((chapter) => <li key={chapter.atS}>{copy.chapterMark(levelNames[chapter.level], formatClock(chapter.atS))}</li>)}
        </ul>
      )}
    </div>
  );
}
