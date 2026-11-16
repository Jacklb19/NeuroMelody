import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { summaryPath } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { useAuth } from '../account/authContext';
import { triageDrafts, type SessionDraft } from './sessionDraft';
import { useSessionDrafts } from './sessionDraftContext';
import { useSessionStore } from './sessionStoreContext';
import { storeErrorMessage } from './storeErrorMessage';
import { useRecordFormatter } from './useRecordFormatter';

type Offer =
  | { readonly kind: 'none' }
  | { readonly kind: 'offered'; readonly draft: SessionDraft; readonly failure: unknown }
  | { readonly kind: 'saved'; readonly id: string };

/**
 * Offers, once per visit, to save the stretch of a session left open when
 * the page closed (ADR-62). Only the account that started it sees it; it is
 * saved with the session's own id, so saving twice stores it once, and the
 * music is never started again from here.
 */
export function DraftRecoveryNotice(): React.JSX.Element | null {
  const copy = useMessages().records.draftRecovery;
  const t = useMessages();
  const format = useRecordFormatter();
  const drafts = useSessionDrafts();
  const store = useSessionStore();
  const { state } = useAuth();
  const owner = state.kind === 'signed_in' ? state.user.id : null;
  const [offer, setOffer] = useState<Offer>({ kind: 'none' });

  useEffect(() => {
    if (owner === null) return undefined;
    // An object, not a `let`: the check below runs after awaits, when the effect may have been cleaned up.
    const run = { cancelled: false };
    void (async () => {
      const { offer: found, discard } = triageDrafts(await drafts.list(), owner, new Date());
      await Promise.all(discard.map((id) => drafts.delete(id)));
      if (found === null) return;
      // Already in the history (the page closed after saving it): the draft has nothing left to give.
      if ((await store.get(found.id)) !== null) {
        await drafts.delete(found.id);
        return;
      }
      if (!run.cancelled) setOffer({ kind: 'offered', draft: found, failure: null });
    })().catch(() => {
      // Drafts that cannot be read are simply not offered.
    });
    return () => { run.cancelled = true; };
  }, [drafts, store, owner]);

  if (offer.kind === 'none') return null;
  if (offer.kind === 'saved') {
    return (
      <div className="glass-card draft-recovery" role="status">
        <p>{copy.saved} <Link to={summaryPath(offer.id)}>{copy.view}</Link></p>
      </div>
    );
  }

  const { draft } = offer;
  const save = (): void => {
    store.save(draft.record)
      .then(() => drafts.delete(draft.id).catch(() => undefined))
      .then(() => { setOffer({ kind: 'saved', id: draft.id }); }, (cause: unknown) => { setOffer({ kind: 'offered', draft, failure: cause }); });
  };
  const discard = (): void => {
    drafts.delete(draft.id).catch(() => undefined).finally(() => { setOffer({ kind: 'none' }); });
  };

  return (
    <section className="glass-card draft-recovery" aria-labelledby="draft-recovery-title">
      <h2 id="draft-recovery-title">{copy.title}</h2>
      <p>{copy.text(format.listened(draft.record.listenedSeconds))}</p>
      {offer.failure !== null && <p role="alert" className="form-error">{copy.failed(storeErrorMessage(offer.failure, t))}</p>}
      <div className="action-row">
        <button type="button" className="pill-button pill-button-primary" onClick={save}>{copy.save}</button>
        <button type="button" className="pill-button pill-button-ghost" onClick={discard}>{copy.discard}</button>
      </div>
    </section>
  );
}
