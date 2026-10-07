import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { CAPABILITY_IDS, type CapabilityCopy, type CapabilityId } from './capabilityCatalog';
import { checkCapabilities } from './checkCapabilities';

describe('capability catalog', () => {
  it('lists every capability that checkCapabilities reports', () => {
    expect([...CAPABILITY_IDS].sort()).toEqual(Object.keys(checkCapabilities()).sort());
  });

  it('has a name and a description for every capability', () => {
    const copy: Readonly<Record<CapabilityId, CapabilityCopy>> = es.diagnostics.capabilities;
    for (const id of CAPABILITY_IDS) {
      expect(copy[id].label).not.toBe('');
      expect(copy[id].description).not.toBe('');
    }
  });
});
