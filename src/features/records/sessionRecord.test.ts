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
});
