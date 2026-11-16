import { useEffect, useId, useRef, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { isMelodyName, MELODY_NAME_LIMIT } from './melody';

interface SaveMelodyDialogProps {
  /** The name offered: the world (or the sound) and the day. */
  readonly proposedName: string;
  readonly onSave: (name: string) => void;
  readonly onCancel: () => void;
}

/**
 * Asks for the name of the melody being saved (P-17). While it is open the
 * Escape key closes it instead of stopping the music: the playback panel
 * leaves Escape alone while a dialog is open.
 */
export function SaveMelodyDialog({ proposedName, onSave, onCancel }: SaveMelodyDialogProps): React.JSX.Element {
  const t = useMessages();
  const copy = t.listen.save;
  const [name, setName] = useState(proposedName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const hintId = useId();
  const inputId = useId();

  // Modal where the browser can: the page behind waits and the focus stays in the dialog. The
  // browser's own Escape on a modal dialog fires `cancel`, which closes it without keeping the name.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog?.setAttribute('open', '');
    inputRef.current?.select();
    return () => { if (dialog?.open === true) dialog.close(); };
  }, []);

  const trimmed = name.trim();
  return (
    <dialog ref={dialogRef} className="listen-save-dialog" aria-labelledby={titleId} aria-describedby={hintId}
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onCancel();
      }}>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (isMelodyName(trimmed)) onSave(trimmed);
      }}>
        <h3 id={titleId}>{copy.title}</h3>
        <label htmlFor={inputId}>{copy.nameLabel}</label>
        <input ref={inputRef} id={inputId} className="tool-input" value={name} maxLength={MELODY_NAME_LIMIT} required
          onChange={(event) => { setName(event.target.value); }} />
        <p id={hintId} className="secondary-text">{copy.hint(MELODY_NAME_LIMIT)}</p>
        <div className="action-row">
          <button type="submit" className="button button-primary" disabled={!isMelodyName(trimmed)}>{copy.confirm}</button>
          <button type="button" className="button button-secondary" onClick={onCancel}>{t.common.cancel}</button>
        </div>
      </form>
    </dialog>
  );
}
