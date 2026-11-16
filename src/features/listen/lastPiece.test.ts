import { describe, expect, it } from 'vitest';
import { forgetLastPiece, readLastPiece, writeLastPiece, type LastPiece } from './lastPiece';

const LAST: LastPiece = {
  piece: { seed: 42, initialLevel: 'sleep', instrument: 'warm', ambience: 'sea', profile: 'original', startAtS: 754.2 },
  melodyId: null,
  mix: { music: 1, ambience: 0.6 },
};

function tabStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => { values.clear(); },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('last piece', () => {
  it('comes back as it was left, for the same account only', () => {
    const storage = tabStorage();
    writeLastPiece('ana', LAST, storage);
    expect(readLastPiece('ana', storage)).toEqual(LAST);
    expect(readLastPiece('ben', storage)).toBeNull();
    forgetLastPiece('ana', storage);
    expect(readLastPiece('ana', storage)).toBeNull();
  });

  it('refuses what is not a piece the synthesizer can play', () => {
    const storage = tabStorage();
    for (const broken of [
      { ...LAST, piece: { ...LAST.piece, seed: -1 } },
      { ...LAST, piece: { ...LAST.piece, initialLevel: 'fast' } },
      { ...LAST, piece: { ...LAST.piece, startAtS: Number.NaN } },
      { ...LAST, mix: { music: 2, ambience: 1 } },
      { ...LAST, melodyId: 7 },
    ]) {
      storage.setItem('neuromelody.last-piece.ana', JSON.stringify(broken));
      expect(readLastPiece('ana', storage)).toBeNull();
    }
    storage.setItem('neuromelody.last-piece.ana', '{not json');
    expect(readLastPiece('ana', storage)).toBeNull();
  });

  it('works without storage', () => {
    expect(readLastPiece('ana', null)).toBeNull();
    expect(() => { writeLastPiece('ana', LAST, null); }).not.toThrow();
  });
});
