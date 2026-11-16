import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { createMelody } from '../listen/melody';
import { BACKUP_FORMAT, BACKUP_VERSION, parseListeningBackup } from './listeningBackup';
import { MemorySessionStore } from './sessionStore';

const owner = 'account';
const record = sessionRecord({ ownerId: owner, note: 'Original' });

function backup(sessions: unknown[]): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, owner, sessions, favorites: [], melodies: [] });
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

  it('carries the melodies of the account and still reads a copy made before them (P-17)', () => {
    const melody = createMelody({
      name: 'Bosque', seed: 7, instrument: 'bowls', ambience: 'wind', profile: 'immersive', level: 'target', positionS: 60, durationMin: 30, musicMix: 1, ambienceMix: 0.5,
    }, owner);
    const withMelody = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, owner, sessions: [], favorites: [], melodies: [melody] });
    expect(parseListeningBackup(withMelody, owner).melodies).toEqual([melody]);
    expect(() => parseListeningBackup(withMelody.replace(owner, owner), 'another')).toThrow(TypeError);
    const ofAnother = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, owner, sessions: [], favorites: [], melodies: [{ ...melody, ownerId: 'another' }] });
    expect(() => parseListeningBackup(ofAnother, owner)).toThrow(TypeError);
    const versionOne = JSON.stringify({ format: BACKUP_FORMAT, version: 1, owner, sessions: [record], favorites: [] });
    expect(parseListeningBackup(versionOne, owner)).toMatchObject({ version: BACKUP_VERSION, melodies: [] });
  });
});
