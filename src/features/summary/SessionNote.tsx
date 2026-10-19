import { useId, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { MAX_NOTE_LENGTH } from '../records/sessionContext';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { storeErrorMessage } from '../records/storeErrorMessage';

/** Explicit local save; editing a note never sends a session or a model request. */
export function SessionNote({ record, onSaved }: { readonly record: SessionRecord; readonly onSaved: (record: SessionRecord) => void }): React.JSX.Element {
  const t = useMessages();
  const copy = t.insights.note;
  const store = useSessionStore();
  const titleId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState(record.note ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<'saved' | 'removed' | null>(null);
  const [failure, setFailure] = useState<{ cause: unknown } | null>(null);
  const save = (text: string): void => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    setSaved(null);
    void store.setNote(record.id, text).then((updated) => {
      setDraft(updated.note ?? '');
      setSaved(text.trim() === '' ? 'removed' : 'saved');
      onSaved(updated);
    }, (cause: unknown) => { setFailure({ cause }); }).finally(() => { setBusy(false); });
  };
  return (
    <section className="summary-section session-note" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.title}</h2>
      <p id={hintId} className="secondary-text">{copy.hint}</p>
      <label className="field-label">{copy.label}
        <textarea value={draft} maxLength={MAX_NOTE_LENGTH} rows={3} disabled={busy} aria-describedby={hintId}
          onChange={(event) => { setDraft(event.target.value); setSaved(null); }} />
      </label>
      <p className="secondary-text">{copy.remaining(draft.length, MAX_NOTE_LENGTH)}</p>
      <div className="action-row">
        <button type="button" className="button button-primary" disabled={busy || draft.trim() === (record.note ?? '')} onClick={() => { save(draft); }}>{copy.save}</button>
        {(record.note ?? '') !== '' && <button type="button" className="text-button" disabled={busy} onClick={() => { save(''); }}>{copy.remove}</button>}
      </div>
      <p role="status">{saved === null ? '' : copy[saved]}</p>
      {failure !== null && <p role="alert">{storeErrorMessage(failure.cause, t)}</p>}
    </section>
  );
}
