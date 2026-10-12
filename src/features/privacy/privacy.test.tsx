import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { AuthContext, type AuthContextValue } from '../account/authContext';
import { CloudSyncProvider } from '../cloud/CloudSyncProvider';
import { LandingPage } from '../landing/LandingPage';
import { LANDING_SECTIONS } from '../landing/landingCatalog';
import { CONSENT_STORAGE_KEY, readConsent, writeConsent } from './consentStore';
import { PRIVACY_SECTION_IDS } from './privacyCatalog';
import { PrivacyPage } from './PrivacyPage';

const copy = es.privacy;

/** Nobody signed in and no account service: the consent can only live on the device. */
const WITHOUT_ACCOUNT: AuthContextValue = {
  state: { kind: 'signed_out' },
  service: null,
  refresh: () => Promise.resolve(),
  finishRecovery: () => Promise.resolve(),
};

/** Wording the app must never use about itself: it describes, it does not treat or diagnose. */
const CLINICAL_CLAIMS = /diagn[oó]s|\bcura\b|\bcure[sd]?\b|alivia|relieves?|reduce el dolor|reduces? (the )?pain|tratamiento para|treatment for/i;

beforeEach(() => {
  window.localStorage.clear();
});

describe('consent kept on the device', () => {
  it('reads only a real instant and treats unreadable storage as no consent', () => {
    const kept = new Map<string, string>();
    const storage = {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => { kept.set(key, value); },
      removeItem: (key: string) => { kept.delete(key); },
    };
    expect(readConsent(storage)).toBeNull();
    kept.set(CONSENT_STORAGE_KEY, 'yes');
    // Something that is not the instant it was given is not a consent.
    expect(readConsent(storage)).toBeNull();

    const at = new Date('2026-10-12T10:00:00.000Z');
    expect(writeConsent(true, at, storage)).toBe(at.toISOString());
    expect(readConsent(storage)).toBe(at.toISOString());
    expect(writeConsent(false, at, storage)).toBeNull();
    expect(kept.has(CONSENT_STORAGE_KEY)).toBe(false);

    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => undefined };
    expect(readConsent(broken)).toBeNull();
    // The choice still holds for this visit, and nothing is thrown at the person.
    expect(writeConsent(true, at, broken)).toBe(at.toISOString());
  });
});

describe('PrivacyPage', () => {
  it('explains every part of the data handling and keeps the consent of someone without an account on the device', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthContext value={WITHOUT_ACCOUNT}>
          <CloudSyncProvider apiBaseUrl={null}>
            <PrivacyPage />
          </CloudSyncProvider>
        </AuthContext>
      </MemoryRouter>,
    );

    for (const id of PRIVACY_SECTION_IDS) {
      expect(screen.getByRole('heading', { level: 2, name: copy.sections[id].title })).toBeVisible();
    }
    expect(screen.getByText(copy.consent.stored.device)).toBeVisible();

    const box = screen.getByRole('checkbox', { name: copy.consent.label });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(readConsent()).not.toBeNull();

    // Withdrawing it is as easy as giving it, and the page says it was withdrawn.
    await user.click(box);
    expect(await screen.findByText(copy.consent.withdrawn)).toBeVisible();
    expect(readConsent()).toBeNull();
  });
});

describe('landing page', () => {
  it('leads to an account, to the app and to each of its sections', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    for (const anchor of Object.values(LANDING_SECTIONS)) {
      expect(document.getElementById(anchor)).not.toBeNull();
      expect(document.querySelector(`a[href="#${anchor}"]`)).not.toBeNull();
    }
  });

  it.each([['es', es], ['en', en]] as const)('promises nothing clinical in its copy (%s)', (_locale, messages) => {
    // Every sentence of the public page and of the privacy page, with their figures filled in.
    const texts: string[] = [];
    const collect = (value: unknown): void => {
      if (typeof value === 'string') texts.push(value);
      else if (typeof value === 'function') {
        const text: unknown = (value as (...args: number[]) => unknown)(3, 7, 11);
        if (typeof text === 'string') texts.push(text);
      } else if (typeof value === 'object' && value !== null) Object.values(value).forEach(collect);
    };
    collect(messages.landing);
    collect(messages.privacy);

    expect(texts.length).toBeGreaterThan(20);
    expect(texts.filter((text) => CLINICAL_CLAIMS.test(text))).toEqual([]);
  });
});
