import { useId, useState } from 'react';
import { useMessages } from '../../i18n/messages';
import { downloadText } from '../../shared/downloadText';
import { readFavorites, writeFavorites } from '../plan/favorites';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, parseListeningBackup, type ListeningBackup } from './listeningBackup';
import { useSessionStore } from './sessionStoreContext';

/** Explicit, account-bound export and merge of the local listening library. */
export function ListeningBackupPanel({ owner, onRestored }: { readonly owner: string; readonly onRestored: () => void }): React.JSX.Element {
  const copy = useMessages().listeningTools;
  const titleId = useId();
  const store = useSessionStore();
  const [pending, setPending] = useState<ListeningBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function exportBackup(): Promise<void> {
    setBusy(true);
    try {
      const backup: ListeningBackup = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        owner,
        sessions: (await store.list()).filter((record) => record.ownerId === owner),
        favorites: readFavorites(owner),
      };
      const content = JSON.stringify(backup);
      if (new Blob([content]).size > MAX_BACKUP_BYTES) throw new RangeError('Backup exceeds the import limit.');
      downloadText('neuromelody-backup.json', content, 'application/json');
      setNotice(copy.backupDownloaded);
    } catch {
      setNotice(copy.backupFailed);
    } finally {
      setBusy(false);
    }
  }

  async function selectBackup(file: File): Promise<void> {
    setBusy(true);
    setPending(null);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new RangeError('Backup too large.');
      const backup = parseListeningBackup(await file.text(), owner);
      setPending(backup);
      setNotice(copy.backupReady(backup.sessions.length, backup.favorites.length));
    } catch {
      setNotice(copy.backupInvalid);
    } finally {
      setBusy(false);
    }
  }

  async function restore(backup: ListeningBackup): Promise<void> {
    setBusy(true);
    try {
      await store.restore(backup.sessions);
      onRestored();
      const existing = readFavorites(owner);
      const names = new Set(existing.map(({ name }) => name));
      const missing = backup.favorites.filter(({ name }) => !names.has(name));
      if (missing.length > 0) writeFavorites(owner, [...existing, ...missing]);
      setNotice(copy.backupDone);
      setPending(null);
    } catch {
      setNotice(copy.backupFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-section glass-card listening-tools" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.backup}</h2>
      <p className="secondary-text">{copy.backupHint}</p>
      <div className="action-row">
        <button type="button" className="pill-button pill-button-ghost" disabled={busy} onClick={() => { void exportBackup(); }}>{copy.exportBackup}</button>
        <label>
          {copy.selectBackup}
          <input type="file" accept=".json,application/json" className="tool-input" disabled={busy} onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file !== undefined) void selectBackup(file);
          }} />
        </label>
        {pending !== null && <button type="button" className="pill-button pill-button-primary" disabled={busy} onClick={() => { void restore(pending); }}>{copy.importBackup}</button>}
      </div>
      <p role="status">{notice}</p>
    </section>
  );
}
