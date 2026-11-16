import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { AuthContext, type AuthState } from '../account/authContext';
import { CloudError, type CloudApi, type ComposedPlan } from '../cloud/cloudApi';
import { CloudSyncContext, type CloudSyncStatus, type CloudSyncValue } from '../cloud/cloudSyncContext';
import { PlanPage } from './PlanPage';
import { PLAN_TEXT_MAX_CHARS } from './plan';
import { PlanComposer } from './PlanComposer';
import { LocaleContext } from '../../i18n/messages';
import type { Locale } from '../../i18n/locale';

const copy = es.plan.compose;
const SIGNED_IN: AuthState = { kind: 'signed_in', user: { id: 'user-1', email: 'persona@example.test', name: null }, assurance: { current: 'aal1', next: 'aal1' } };
const TEXT = 'Hoy me siento mal, estoy estudiando y quiero relajarme unos 30 minutos';
const PLAN: ComposedPlan = { goal: 'relax', durationMin: 30, world: 'city_rain', fixed: true, note: 'Media hora de piano con lluvia.' };

function cloud(status: CloudSyncStatus, api: Partial<CloudApi> | null): CloudSyncValue {
  return {
    status,
    error: null,
    revision: 0,
    pendingDeletions: 0,
    consentAt: null,
    setConsent: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    forgetDeviceCopies: () => Promise.resolve(0),
    forgetAccount: () => Promise.resolve(),
    api: api as CloudApi | null,
  };
}

/** Where the session screen was opened, so a test can read the plan it carries. */
function SessionAddress(): React.JSX.Element {
  const location = useLocation();
  return <p data-testid="session-address">{location.search}</p>;
}

function renderPlan(value: CloudSyncValue): void {
  render(
    <AuthContext value={{ state: SIGNED_IN, service: null, refresh: () => Promise.resolve(), finishRecovery: () => Promise.resolve() }}>
      <CloudSyncContext value={value}>
        <MemoryRouter initialEntries={[ROUTES.plan]}>
          <Routes>
            <Route path={ROUTES.plan} element={<PlanPage />} />
            <Route path={ROUTES.session} element={<SessionAddress />} />
          </Routes>
        </MemoryRouter>
      </CloudSyncContext>
    </AuthContext>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('plan composed from what the person writes (ADR-68)', () => {
  it('shows the send button only once there is text, and sends nothing else', async () => {
    const user = userEvent.setup();
    const composePlan = vi.fn<CloudApi['composePlan']>(() => Promise.resolve(PLAN));
    renderPlan(cloud('synced', { composePlan }));

    const field = screen.getByRole('textbox', { name: copy.question });
    expect(field).toHaveAttribute('maxlength', String(PLAN_TEXT_MAX_CHARS));
    expect(screen.queryByRole('button', { name: copy.send })).not.toBeInTheDocument();
    await user.type(field, '   ');
    expect(screen.queryByRole('button', { name: copy.send })).not.toBeInTheDocument();
    await user.clear(field);
    await user.type(field, `  ${TEXT}  `);
    await user.click(screen.getByRole('button', { name: copy.send }));

    expect(composePlan).toHaveBeenCalledExactlyOnceWith(TEXT, expect.any(Number), 'es');
    // No warning or consent box stands between the person and the plan.
    expect(screen.queryByRole('checkbox', { name: /consent/i })).not.toBeInTheDocument();
  });

  it('shows the plan as an automatic proposal and changes nothing until it is used', async () => {
    const user = userEvent.setup();
    renderPlan(cloud('synced', { composePlan: () => Promise.resolve(PLAN) }));
    await user.type(screen.getByRole('textbox', { name: copy.question }), TEXT);
    await user.click(screen.getByRole('button', { name: copy.send }));

    const proposal = await screen.findByRole('region', { name: `${copy.resultTitle}: ${es.plan.worlds.names.city_rain}` });
    expect(proposal).toHaveFocus();
    expect(screen.getByText(copy.generatedMark)).toBeVisible();
    expect(screen.getByText(es.plan.minutes(30), { selector: '.plan-compose-facts strong' })).toBeVisible();
    expect(screen.getByText(copy.modes.fixed)).toBeVisible();
    expect(screen.getByText(PLAN.note ?? '')).toBeVisible();
    // The manual choices below are still the person's own.
    expect(screen.getByRole('radio', { name: es.plan.minutes(20) })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: es.plan.goals.names.relax })).not.toBeChecked();
  });

  it('uses the plan and opens the session with exactly its choices', async () => {
    const user = userEvent.setup();
    renderPlan(cloud('synced', { composePlan: () => Promise.resolve(PLAN) }));
    await user.type(screen.getByRole('textbox', { name: copy.question }), TEXT);
    await user.click(screen.getByRole('button', { name: copy.send }));
    await user.click(await screen.findByRole('button', { name: copy.use }));

    const query = new URLSearchParams(screen.getByTestId('session-address').textContent);
    // City rain is a piano with rain; the texture is the original one, so it does not travel.
    expect(Object.fromEntries(query)).toEqual({ goals: 'relax', duration: '30', ambience: 'rain', instrument: 'piano', 'sound-mode': 'fixed' });
  });

  it('goes back to the text as it was with "No, thanks", and leaves the plan alone', async () => {
    const user = userEvent.setup();
    renderPlan(cloud('synced', { composePlan: () => Promise.resolve({ ...PLAN, goal: null, note: null, fixed: false }) }));
    await user.type(screen.getByRole('textbox', { name: copy.question }), TEXT);
    await user.click(screen.getByRole('button', { name: copy.send }));
    expect(await screen.findByText(copy.noGoal)).toBeVisible();
    expect(screen.getByText(copy.modes.adaptive)).toBeVisible();
    await user.click(screen.getByRole('button', { name: copy.dismiss }));

    expect(screen.getByRole('textbox', { name: copy.question })).toHaveValue(TEXT);
    expect(screen.getByRole('radio', { name: es.plan.minutes(20) })).toBeChecked();
  });

  it('says in one line when the plan cannot be composed, and the manual plan stays', async () => {
    const user = userEvent.setup();
    const composePlan = vi.fn<CloudApi['composePlan']>(() => Promise.reject(new CloudError('rate_limited')));
    renderPlan(cloud('synced', { composePlan }));
    await user.type(screen.getByRole('textbox', { name: copy.question }), `${TEXT}{Enter}`);

    expect(composePlan).toHaveBeenCalledOnce();
    expect(await screen.findByText(copy.failed(es.cloud.errors.rate_limited))).toBeVisible();
    expect(screen.getByRole('button', { name: es.plan.continueToSession })).toBeEnabled();
  });

  it('keeps a new line with Shift+Enter instead of sending', async () => {
    const user = userEvent.setup();
    const composePlan = vi.fn<CloudApi['composePlan']>(() => Promise.resolve(PLAN));
    renderPlan(cloud('synced', { composePlan }));
    await user.type(screen.getByRole('textbox', { name: copy.question }), 'algo tranquilo{Shift>}{Enter}{/Shift}');

    expect(composePlan).not.toHaveBeenCalled();
  });

  it('is not shown in a deployment without an API', () => {
    renderPlan(cloud('unavailable', null));
    expect(screen.queryByRole('textbox', { name: copy.question })).not.toBeInTheDocument();
  });

  it.each(['account', 'language'] as const)('discards text and a late answer after changing %s', async (change) => {
    let answer: ((plan: ComposedPlan) => void) | undefined;
    const composePlan = vi.fn<CloudApi['composePlan']>(() => new Promise((resolve) => { answer = resolve; }));
    const value = cloud('synced', { composePlan });
    const view = (state: AuthState, locale: Locale): React.JSX.Element => (
      <LocaleContext value={locale}>
        <AuthContext value={{ state, service: null, refresh: () => Promise.resolve(), finishRecovery: () => Promise.resolve() }}>
          <CloudSyncContext value={value}><PlanComposer onUse={vi.fn()} /></CloudSyncContext>
        </AuthContext>
      </LocaleContext>
    );
    const user = userEvent.setup();
    const { rerender } = render(view(SIGNED_IN, 'es'));
    await user.type(screen.getByRole('textbox'), `${TEXT}{Enter}`);
    const nextAccount: AuthState = { ...SIGNED_IN, user: { ...SIGNED_IN.user, id: 'user-2' } };
    rerender(view(change === 'account' ? nextAccount : SIGNED_IN, change === 'language' ? 'en' : 'es'));
    await act(async () => { answer?.(PLAN); await Promise.resolve(); });
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
