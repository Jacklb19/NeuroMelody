import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import {
  loadLatestActivationModel,
  PUBLISHED_MODEL_STORAGE_KEY,
} from '../adaptation/classifier/activationModel';
import { CloudError, createCloudApi, type CloudApi } from '../cloud/cloudApi';
import { CloudSyncContext, type CloudSyncStatus, type CloudSyncValue } from '../cloud/cloudSyncContext';
import { CollectionPage } from './CollectionPage';
import { COLLECTION_STAGE_IDS, STAGE_SECONDS } from './collectionProtocol';
import type { CollectionRecording } from './collectionRecording';
import { CollectionStoreContext, MemoryCollectionStore } from './collectionStore';

const copy = es.collection;
const RECORDING: CollectionRecording = {
  id: '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
  participant: '5f0c1d4e-1111-4222-8333-444455556666',
  recordedAt: '2026-10-12T10:00:00.000Z',
  consentAt: '2026-10-12T10:00:00.000Z',
  sourceKind: 'ble',
  segments: COLLECTION_STAGE_IDS.map((label) => ({ label, plannedSeconds: STAGE_SECONDS[label], beatTimesMs: [800, 1600], rrMs: [800, 800] })),
};

function cloud(status: CloudSyncStatus, api: Partial<CloudApi> | null): CloudSyncValue {
  return {
    status, error: null, revision: 0, pendingDeletions: 0, consentAt: null,
    setConsent: () => Promise.resolve(), syncNow: () => Promise.resolve(), api: api as CloudApi | null,
  };
}

async function renderPage(value: CloudSyncValue): Promise<MemoryCollectionStore> {
  const store = new MemoryCollectionStore();
  await store.save(RECORDING);
  render(
    <CloudSyncContext value={value}>
      <CollectionStoreContext value={store}>
        <MemoryRouter><CollectionPage /></MemoryRouter>
      </CollectionStoreContext>
    </CloudSyncContext>,
  );
  return store;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('sending guided recordings for training', () => {
  it('sends a recording only after the person agrees, and then says it was sent', async () => {
    const user = userEvent.setup();
    const sendRecording = vi.fn<CloudApi['sendRecording']>(() => Promise.resolve());
    await renderPage(cloud('synced', { sendRecording, listSentRecordings: () => Promise.resolve([]) }));

    await user.click(await screen.findByRole('button', { name: copy.share.offer }));
    // What travels is said before the button that sends it.
    expect(screen.getByText(copy.share.explanation)).toBeVisible();
    expect(sendRecording).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: copy.share.accept }));

    expect(sendRecording).toHaveBeenCalledWith(RECORDING);
    expect(await screen.findByTestId('recording-sent')).toHaveTextContent(copy.share.sent);
    expect(screen.queryByRole('button', { name: copy.share.offer })).not.toBeInTheDocument();
  });

  it('withdraws a sent recording before deleting it, and keeps it when the cloud does not confirm', async () => {
    const user = userEvent.setup();
    const withdrawRecording = vi.fn<CloudApi['withdrawRecording']>()
      .mockRejectedValueOnce(new CloudError('network'))
      .mockResolvedValue(undefined);
    const store = await renderPage(cloud('synced', { withdrawRecording, listSentRecordings: () => Promise.resolve([RECORDING.id]) }));
    const item = within(within(await screen.findByRole('region', { name: copy.list.title })).getByRole('listitem'));
    await item.findByTestId('recording-sent');

    await user.click(item.getByRole('button', { name: copy.list.delete }));
    await user.click(item.getByRole('button', { name: copy.share.confirmDeleteSent }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.share.failed(es.cloud.errors.network));
    expect(await store.list()).toHaveLength(1);

    // The confirmation is still open: trying again is one more click.
    await user.click(screen.getByRole('button', { name: copy.share.confirmDeleteSent }));
    await waitFor(async () => { expect(await store.list()).toEqual([]); });
    expect(withdrawRecording).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['signed_out', null, ROUTES.login],
    ['needs_second_factor', {}, ROUTES.account],
  ] as const)('does not offer to send heartbeats when the status is %s, and says what is missing', async (status, api, route) => {
    await renderPage(cloud(status, api));
    expect(await screen.findByText(copy.share.needs[status], { exact: false })).toBeVisible();
    expect(screen.getByRole('link', { name: es.cloud.actions[status] })).toHaveAttribute('href', route);
    expect(screen.queryByRole('button', { name: copy.share.offer })).not.toBeInTheDocument();
    // Exporting and deleting stay, with or without an account.
    expect(screen.getByRole('button', { name: copy.list.exportAll(1) })).toBeEnabled();
  });

  it('sends the recording in the API field names, with the consent that sending states', async () => {
    const sent: { url: string; method: string | undefined; body: unknown }[] = [];
    const api = createCloudApi({
      baseUrl: 'https://api.example.test',
      accessToken: () => Promise.resolve('token-1'),
      fetch: (input, init) => {
        sent.push({ url: typeof input === 'string' ? input : '', method: init?.method, body: JSON.parse(typeof init?.body === 'string' ? init.body : 'null') as unknown });
        return Promise.resolve(new Response(JSON.stringify({ id: RECORDING.id, created: true, recordings: [{ id: RECORDING.id }, { beats: 3 }] }), { status: 200 }));
      },
    });

    await api.sendRecording(RECORDING);
    expect(sent[0]?.url).toBe('https://api.example.test/v1/recordings');
    expect(sent[0]?.body).toMatchObject({
      id: RECORDING.id,
      source_kind: 'ble',
      recorded_at: RECORDING.recordedAt,
      consent: true,
      segments: [{ label: 'rest', planned_seconds: STAGE_SECONDS.rest, beat_times_ms: [800, 1600], rr_ms: [800, 800] }, {}, {}],
    });
    // The instant of the local consent stays on the device: sending has its own.
    expect(sent[0]?.body).not.toHaveProperty('consent_at');
    expect(await api.listSentRecordings()).toEqual([RECORDING.id]);
  });
});

describe('latest published classifier', () => {
  const shipped: unknown = JSON.parse(readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public', 'models', 'activation-classifier.json'), 'utf8',
  ));
  const published = { ...(shipped as Record<string, unknown>), trainedAt: '2026-11-02' };
  const shippedFile: typeof fetch = () => Promise.resolve(new Response(JSON.stringify(shipped), { status: 200 }));

  it('uses the published version and keeps it for the next time without a network', async () => {
    const online = await loadLatestActivationModel({ published: () => Promise.resolve(published), fetchModel: shippedFile });
    expect(online?.trainedAt).toBe('2026-11-02');
    expect(window.localStorage.getItem(PUBLISHED_MODEL_STORAGE_KEY)).toContain('2026-11-02');

    const offline = await loadLatestActivationModel({ published: () => Promise.reject(new CloudError('network')), fetchModel: shippedFile });
    expect(offline?.trainedAt).toBe('2026-11-02');
    // Without an account nothing is asked, and the kept version is still the one used.
    expect((await loadLatestActivationModel({ fetchModel: shippedFile }))?.trainedAt).toBe('2026-11-02');
  });

  it('ignores a published file that does not validate and falls back to the model it ships with', async () => {
    const damaged = { ...published, temperature: 0 };
    const model = await loadLatestActivationModel({ published: () => Promise.resolve(damaged), fetchModel: shippedFile });
    expect(model?.trainedAt).toBe((shipped as { trainedAt: string }).trainedAt);
    expect(window.localStorage.getItem(PUBLISHED_MODEL_STORAGE_KEY)).toBeNull();
  });

  it('forgets the kept version once none is published, and never waits long for an answer', async () => {
    window.localStorage.setItem(PUBLISHED_MODEL_STORAGE_KEY, JSON.stringify(published));
    const withdrawn = await loadLatestActivationModel({ published: () => Promise.resolve(null), fetchModel: shippedFile });
    expect(withdrawn?.trainedAt).toBe((shipped as { trainedAt: string }).trainedAt);
    expect(window.localStorage.getItem(PUBLISHED_MODEL_STORAGE_KEY)).toBeNull();

    const slow = await loadLatestActivationModel({ published: () => new Promise(() => undefined), fetchModel: shippedFile, timeoutMs: 10 });
    expect(slow?.trainedAt).toBe((shipped as { trainedAt: string }).trainedAt);
  });
});
