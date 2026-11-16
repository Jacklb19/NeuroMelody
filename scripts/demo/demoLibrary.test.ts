import { describe, expect, it } from 'vitest';
import { parseListeningBackup } from '../../src/features/records/listeningBackup';
import { isSessionRecord } from '../../src/features/records/sessionRecord';
import { worthKeeping } from '../../src/features/records/retentionPolicy';
import { historyInsights } from '../../src/features/progress/historyInsights';
import { buildDemoBackup } from './demoLibrary';

const owner = '018f2a3b-1c2d-7e8f-9a0b-1c2d3e4f5a6b';
const now = new Date('2026-11-16T15:00:00Z');

describe('demo library', () => {
  const backup = buildDemoBackup({ owner, now });
  // Read back as the app reads a backup, so each session is checked and typed as a record.
  const restored = parseListeningBackup(JSON.stringify(backup), owner);

  it('is a backup the app accepts for its own account, and for no other', () => {
    const text = JSON.stringify(backup);
    expect(parseListeningBackup(text, owner).sessions).toHaveLength(backup.sessions.length);
    expect(() => parseListeningBackup(text, '018f2a3b-1c2d-7e8f-9a0b-000000000000')).toThrow();
  });

  it('holds only valid sessions the app would keep, newest first and before today', () => {
    for (const session of restored.sessions) {
      expect(isSessionRecord(session)).toBe(true);
      expect(worthKeeping(session)).toBe(true);
      expect(Date.parse(session.endedAt)).toBeLessThan(now.getTime());
    }
    const starts = backup.sessions.map(({ startedAt }) => Date.parse(startedAt));
    expect(starts).toEqual([...starts].sort((a, b) => b - a));
  });

  it('fits the limits the API checks before storing a session in the cloud', () => {
    for (const session of backup.sessions) {
      expect(session.plannedMinutes).toBeLessThanOrEqual(240);
      expect(new Set(session.samples.map(({ second }) => second)).size).toBe(session.samples.length);
      for (const sample of session.samples) {
        if (sample.meanHr !== null) expect(sample.meanHr).toBeGreaterThan(0);
        if (sample.meanHr !== null) expect(sample.meanHr).toBeLessThanOrEqual(250);
        if (sample.rmssd !== null) expect(sample.rmssd).toBeLessThanOrEqual(1000);
        if (sample.sdnn !== null) expect(sample.sdnn).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('has enough sessions for the progress screen to compare choices', () => {
    expect(backup.sessions.length).toBeGreaterThanOrEqual(30);
    expect(historyInsights(restored.sessions).comparisons.length).toBeGreaterThan(0);
  });

  it('is the same library every time for the same account and day', () => {
    expect(buildDemoBackup({ owner, now })).toEqual(backup);
  });
});
