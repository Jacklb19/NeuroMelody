import { describe, expect, it } from 'vitest';
import { sample, sessionRecord } from '../../test/sessionRecords';
import { summarizeSession } from './summarizeSession';

describe('summarizeSession', () => {
  it('compares the mean of the first and last three good samples', () => {
    const samples = [80, 78, 76, 74, 72, 70, 68, 66].map((meanHr, i) =>
      sample((i + 1) * 5, { meanHr, rmssd: 20 + i * 2 }));
    const summary = summarizeSession(sessionRecord({ samples }));
    expect(summary.heartRate).toEqual({ start: 78, end: 68 });
    expect(summary.rmssd).toEqual({ start: 22, end: 32 });
  });

  it('skips low-quality samples and missing indices', () => {
    const samples = [
      sample(5, { meanHr: null, rmssd: null }),
      sample(10, { meanHr: 200, goodQuality: false }),
      sample(15, { meanHr: 70 }),
      sample(20, { meanHr: 60 }),
    ];
    expect(summarizeSession(sessionRecord({ samples })).heartRate).toEqual({ start: 70, end: 60 });
  });

  it('reports no change without at least two usable samples', () => {
    const summary = summarizeSession(sessionRecord({ samples: [sample(5)] }));
    expect(summary.heartRate).toBeNull();
    expect(summary.rmssd).toBeNull();
  });

  it('adds five seconds of signal per sample to its estimated state', () => {
    const samples = [
      sample(5, { estimatedState: null }),
      sample(10, { estimatedState: null }),
      sample(15, { estimatedState: 'low' }),
      sample(20, { estimatedState: 'low' }),
      sample(25, { estimatedState: 'high' }),
    ];
    expect(summarizeSession(sessionRecord({ samples })).secondsByState)
      .toEqual({ calibrating: 10, high: 5, low: 10, uncertain: 0 });
  });

  it('averages LF/HF over the last samples that have one', () => {
    const samples = [0.5, 1, 2, 3].map((lfHfRatio, i) => sample((i + 1) * 5, { lfHfRatio }));
    expect(summarizeSession(sessionRecord({ samples })).lfHfAtEnd).toBe(2);
  });

  it('subtracts the self-ratings only when both exist', () => {
    expect(summarizeSession(sessionRecord({ ratingBefore: 4, ratingAfter: 7 })).ratingChange).toBe(3);
    expect(summarizeSession(sessionRecord({ ratingBefore: null, ratingAfter: 7 })).ratingChange).toBeNull();
  });
});
