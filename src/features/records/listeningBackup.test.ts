import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { BACKUP_FORMAT, BACKUP_VERSION, parseListeningBackup } from './listeningBackup';
import { MemorySessionStore } from './sessionStore';

const owner = 'account';
const record = sessionRecord({ ownerId: owner, note: 'Original' });

function backup(sessions: unknown[]): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, owner, sessions, favorites: [] });
}

describe('listening backup', () => {
  it('rejects mismatched accounts, invalid records and duplicate session ids before restoration', () => {
    expect(() => parseListeningBackup(backup([record]), 'another')).toThrow(TypeError);
    expect(() => parseListeningBackup(backup([{ ...record, ownerId: 'another' }]), owner)).toThrow(TypeError);
    expect(() => parseListeningBackup(backup([record, { ...record, samples: null }]), owner)).toThrow(TypeError);
    expect(() => parseListeningBackup(backup([record, record]), owner)).toThrow(TypeError);
  });

  it('adds private fields to a synced copy without overwriting ratings or touching another owner', async () => {
    const store = new MemorySessionStore();
    await store.save(sessionRecord({ ownerId: owner, ratingAfter: 8 }));
    await store.restore([record]);
    expect(await store.get(record.id)).toMatchObject({ note: 'Original', ratingAfter: 8 });
    await store.restore([{ ...record, ownerId: 'another', note: 'Different owner' }]);
    expect(await store.get(record.id)).toMatchObject({ ownerId: owner, note: 'Original' });
  });
});
