import { describe, expect, it } from 'vitest';
import { CloudError, type CloudMelody } from '../cloud/cloudApi';
import { createMelody, MAX_MELODIES, renameMelody, type Melody, type MelodyContent } from './melody';
import { MemoryMelodyStore } from './melodyStore';
import {
  EMPTY_LEDGER,
  readMelodyLedger,
  syncMelodies,
  withDeletion,
  writeMelodyLedger,
  type MelodyCloud,
  type MelodyLedger,
} from './melodySync';

const OWNER = 'ana';
const CONTENT: MelodyContent = {
  name: 'Bosque', seed: 1, instrument: 'warm', ambience: 'none', profile: 'original', level: 'target', positionS: 0, musicMix: 1, ambienceMix: 1,
};

const melody = (name: string, at: string): Melody => createMelody({ ...CONTENT, name }, OWNER, new Date(at));

/** The cloud as the API keeps it: the newest version of each melody, and at most `limit` of them. */
function fakeCloud(initial: readonly Melody[] = [], limit = MAX_MELODIES): MelodyCloud & { readonly kept: Map<string, Melody>; readonly deleted: string[] } {
  const kept = new Map(initial.map((item) => [item.id, item]));
  const deleted: string[] = [];
  return {
    kept,
    deleted,
    // The owner never travels: the cloud lists every other field.
    listMelodies: () => Promise.resolve([...kept.values()].map(
      (item): CloudMelody => Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'ownerId')) as CloudMelody,
    )),
    saveMelody(item) {
      const stored = kept.get(item.id);
      if (stored === undefined && kept.size >= limit) return Promise.reject(new CloudError('limit_reached'));
      if (stored === undefined || Date.parse(item.updatedAt) > Date.parse(stored.updatedAt)) kept.set(item.id, item);
      return Promise.resolve();
    },
    deleteMelody(id) {
      deleted.push(id);
      kept.delete(id);
      return Promise.resolve();
    },
  };
}

async function storeWith(...items: Melody[]): Promise<MemoryMelodyStore> {
  const store = new MemoryMelodyStore();
  for (const item of items) await store.put(item);
  return store;
}

const ledgerOf = (synced: readonly string[], pending: readonly string[] = []): MelodyLedger =>
  ({ synced: new Set(synced), pendingDeletions: new Set(pending) });

describe('syncMelodies', () => {
  it('sends the melodies of this device and brings those of another one', async () => {
    const here = melody('Aquí', '2026-11-16T10:00:00Z');
    const there = melody('Allá', '2026-11-16T11:00:00Z');
    const store = await storeWith(here);
    const cloud = fakeCloud([there]);

    const outcome = await syncMelodies(OWNER, store, cloud, EMPTY_LEDGER);

    expect(outcome).toMatchObject({ kind: 'synced', changedHere: true });
    expect(cloud.kept.has(here.id)).toBe(true);
    expect((await store.list(OWNER)).map((item) => item.name)).toEqual(['Allá', 'Aquí']);
    if (outcome.kind !== 'unsupported') expect([...outcome.ledger.synced].sort()).toEqual([here.id, there.id].sort());
  });

  it('keeps the newest name on both sides', async () => {
    const original = melody('Bosque', '2026-11-16T10:00:00Z');
    const renamedHere = renameMelody(original, 'Nombre nuevo', new Date('2026-11-16T12:00:00Z'));
    const store = await storeWith(renamedHere);
    const cloud = fakeCloud([original]);
    await syncMelodies(OWNER, store, cloud, ledgerOf([original.id]));
    expect(cloud.kept.get(original.id)?.name).toBe('Nombre nuevo');

    const renamedThere = renameMelody(renamedHere, 'Desde el teléfono', new Date('2026-11-16T13:00:00Z'));
    cloud.kept.set(original.id, renamedThere);
    await syncMelodies(OWNER, store, cloud, ledgerOf([original.id]));
    expect((await store.list(OWNER))[0]?.name).toBe('Desde el teléfono');
  });

  it('deletes here a melody another device deleted, instead of sending it back', async () => {
    const gone = melody('Borrada', '2026-11-16T10:00:00Z');
    const store = await storeWith(gone);
    const cloud = fakeCloud();

    const outcome = await syncMelodies(OWNER, store, cloud, ledgerOf([gone.id]));

    expect(await store.list(OWNER)).toEqual([]);
    expect(cloud.kept.size).toBe(0);
    expect(outcome).toMatchObject({ changedHere: true });
  });

  it('sends a deletion made without a connection before anything else, and does not bring the melody back', async () => {
    const deleted = melody('Borrada sin red', '2026-11-16T10:00:00Z');
    const store = await storeWith();
    const cloud = fakeCloud([deleted]);
    const ledger = withDeletion(ledgerOf([deleted.id]), deleted.id);

    const outcome = await syncMelodies(OWNER, store, cloud, ledger);

    expect(cloud.deleted).toEqual([deleted.id]);
    expect(await store.list(OWNER)).toEqual([]);
    if (outcome.kind !== 'unsupported') expect(outcome.ledger.pendingDeletions.size).toBe(0);
  });

  it('keeps on this device what a full cloud cannot hold, and says so', async () => {
    const kept = melody('En la nube', '2026-11-16T09:00:00Z');
    const extra = melody('Solo aquí', '2026-11-16T10:00:00Z');
    const store = await storeWith(kept, extra);
    const cloud = fakeCloud([kept], 1);

    const outcome = await syncMelodies(OWNER, store, cloud, ledgerOf([kept.id]));

    expect(outcome.kind).toBe('full');
    expect((await store.list(OWNER)).map((item) => item.id)).toContain(extra.id);
    if (outcome.kind !== 'unsupported') expect(outcome.ledger.synced.has(extra.id)).toBe(false);
  });

  it('stays on this device with an API from before the melodies', async () => {
    const store = await storeWith(melody('Aquí', '2026-11-16T10:00:00Z'));
    const cloud: MelodyCloud = { ...fakeCloud(), listMelodies: () => Promise.reject(new CloudError('not_found')) };
    expect(await syncMelodies(OWNER, store, cloud, EMPTY_LEDGER)).toEqual({ kind: 'unsupported' });
    expect(await store.list(OWNER)).toHaveLength(1);
  });

  it('stops without a connection and leaves every melody where it was', async () => {
    const here = melody('Aquí', '2026-11-16T10:00:00Z');
    const store = await storeWith(here);
    const cloud: MelodyCloud = { ...fakeCloud(), listMelodies: () => Promise.reject(new CloudError('network')) };
    await expect(syncMelodies(OWNER, store, cloud, EMPTY_LEDGER)).rejects.toMatchObject({ code: 'network' });
    expect(await store.list(OWNER)).toEqual([here]);
  });

  it('ignores what the cloud lists that is not a melody', async () => {
    const store = await storeWith();
    const cloud: MelodyCloud = { ...fakeCloud(), listMelodies: () => Promise.resolve([{ id: 'x' } as unknown as CloudMelody]) };
    await syncMelodies(OWNER, store, cloud, EMPTY_LEDGER);
    expect(await store.list(OWNER)).toEqual([]);
  });

  it('never shows one account the melodies of another', async () => {
    const store = await storeWith(createMelody(CONTENT, 'ben'));
    await syncMelodies(OWNER, store, fakeCloud(), EMPTY_LEDGER);
    expect(await store.list(OWNER)).toEqual([]);
    expect(await store.list('ben')).toHaveLength(1);
  });
});

describe('melody ledger', () => {
  it('is kept per account and starts again empty when unreadable', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    writeMelodyLedger(OWNER, ledgerOf(['a'], ['b']), storage);
    expect(readMelodyLedger(OWNER, storage)).toEqual(ledgerOf(['a'], ['b']));
    expect(readMelodyLedger('ben', storage)).toEqual(EMPTY_LEDGER);
    values.set('neuromelody.melody-sync.ana', '{"synced": 3}');
    expect(readMelodyLedger(OWNER, storage)).toEqual(EMPTY_LEDGER);
  });

  it('only queues the deletion of a melody the cloud keeps', () => {
    expect(withDeletion(EMPTY_LEDGER, 'a')).toBe(EMPTY_LEDGER);
    expect(withDeletion(ledgerOf(['a']), 'a')).toEqual(ledgerOf([], ['a']));
  });
});
