import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from './downloadText';

// jsdom has no object URLs: the test provides them and records what would be saved.
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:local-file');
const revokeObjectURL = vi.fn<(url: string) => void>();

describe('downloadText', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('saves the text through a temporary link and releases it afterwards', async () => {
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    downloadText('sesiones.csv', 'a,b\n1,2', 'text/csv');

    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('sesiones.csv');
    expect(clicked[0]?.href).toBe('blob:local-file');
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob?.type).toBe('text/csv');
    expect(await blob?.text()).toBe('a,b\n1,2');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-file');
    // The link is never added to the page.
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
