import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKER_CRASHED } from './protocol';
import { createWorkerPort } from './SignalThreadClient';

/** Stands in for the browser Worker, which jsdom does not have; keeps what the port does with it. */
class FakeWorker {
  static readonly created: FakeWorker[] = [];
  readonly posted: { readonly message: unknown; readonly transfer: Transferable[] }[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;

  constructor(readonly url: URL, readonly options: WorkerOptions) {
    FakeWorker.created.push(this);
  }

  postMessage(message: unknown, transfer: Transferable[]): void {
    this.posted.push({ message, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }
}

function openPort(): { readonly worker: FakeWorker; readonly received: unknown[]; readonly port: ReturnType<typeof createWorkerPort> } {
  const port = createWorkerPort();
  const received: unknown[] = [];
  port.onReceive((data) => { received.push(data); });
  const worker = FakeWorker.created.at(-1);
  if (worker === undefined) throw new Error('No worker was created.');
  return { worker, received, port };
}

describe('createWorkerPort', () => {
  beforeEach(() => {
    FakeWorker.created.length = 0;
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts the signal module as a module worker and forwards messages both ways', () => {
    const { worker, received, port } = openPort();
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.url.pathname).toMatch(/signal\.worker\.ts$/);

    port.send({ kind: 'reset' });
    expect(worker.posted).toEqual([{ message: { kind: 'reset' }, transfer: [] }]);

    worker.onmessage?.(new MessageEvent('message', { data: { kind: 'contact', present: true } }));
    expect(received).toEqual([{ kind: 'contact', present: true }]);

    port.terminate();
    expect(worker.terminated).toBe(true);
  });

  it('reports a crash and an unreadable message as protocol errors', () => {
    const { worker, received } = openPort();

    worker.onerror?.(new ErrorEvent('error', { message: 'boom' }));
    worker.onmessageerror?.();

    expect(received).toEqual([
      { kind: 'error', code: WORKER_CRASHED, detail: 'boom' },
      { kind: 'error', code: 'unreadable_message' },
    ]);
  });
});
