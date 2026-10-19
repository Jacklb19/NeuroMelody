import { describe, expect, it } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { readSessionRecord } from './sessionRecord';

describe('readSessionRecord', () => {
  it('gives records saved before goals existed an empty list', () => {
    const older: Record<string, unknown> = { ...sessionRecord() };
    delete older.goals;
    expect(readSessionRecord(older)?.goals).toEqual([]);
  });

  it('rejects unknown or repeated goals', () => {
    expect(readSessionRecord({ ...sessionRecord(), goals: ['cure'] })).toBeNull();
    expect(readSessionRecord({ ...sessionRecord(), goals: ['relax', 'relax'] })).toBeNull();
  });

  it('keeps what the music did when it is valid, and refuses it otherwise (ADR-42)', () => {
    const music = { startTempoBpm: 72, endTempoBpm: 59, steps: [{ atS: 200, level: 'target', calmer: true }] };
    expect(readSessionRecord({ ...sessionRecord(), music })?.music).toEqual(music);
    expect(readSessionRecord(sessionRecord())?.music).toBeUndefined();
    expect(readSessionRecord({ ...sessionRecord(), music: { ...music, steps: [{ atS: 200, level: 'loud', calmer: true }] } })).toBeNull();
    expect(readSessionRecord({ ...sessionRecord(), music: { ...music, startTempoBpm: -1 } })).toBeNull();
  });
});
