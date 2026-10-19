import { describe, expect, it, vi } from 'vitest';
import { sessionRecord } from '../../test/sessionRecords';
import { createCloudApi } from '../cloud/cloudApi';
import { createSessionContext } from '../records/sessionContext';
import { historyInsights } from './historyInsights';
import { progressNarrativeFromWire, progressObservations } from './progressNarrative';

const records = Array.from({ length: 10 }, (_, index) => sessionRecord({
  context: createSessionContext(index < 5 ? 'piano' : 'warm', 'rain'),
  note: 'private note', ratingBefore: 4, ratingAfter: index < 5 ? 7 : 5,
}));
const observations = progressObservations(historyInsights(records).observations);
const response = { generated: true, model: 'model', framing: 'balance', observation_ids: ['o1'] };

describe('progress narrative boundary', () => {
  it('only projects the visible aggregate figures and exact catalogs', async () => {
    const send = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(response))));
    const api = createCloudApi({ baseUrl: 'https://example.test', accessToken: () => Promise.resolve('token'), fetch: send });
    expect(await api.summarizeProgress('es', observations)).toEqual({ framing: 'balance', observationIds: ['o1'] });
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe('https://example.test/v1/progress/summary');
    const body = typeof init?.body === 'string' ? init.body : '';
    expect(JSON.parse(body)).toEqual({ consent: true, locale: 'es', observations });
    for (const privateField of ['note', 'localDate', 'localHour', 'startedAt', 'samples', 'private note']) expect(body).not.toContain(privateField);
    expect(observations[0]?.groups.map((group) => group.median)).toEqual([3, 1]);
  });

  it.each([
    { generated: false }, { framing: 'advice' }, { model: '' }, { observation_ids: [] },
    { observation_ids: ['o2'] }, { observation_ids: ['o1', 'o1'] }, { text: 'invented prose' }, { median: 99 },
  ])('rejects untrusted output: %j', (invalid) => {
    expect(progressNarrativeFromWire({ ...response, ...invalid }, observations)).toBeNull();
  });
});
