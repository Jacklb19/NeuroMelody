import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '../../config/routes';
import { es } from '../../i18n/es';
import { CloudError, type CloudApi } from '../cloud/cloudApi';
import { CloudSyncContext, type CloudSyncStatus, type CloudSyncValue } from '../cloud/cloudSyncContext';
import { PlanPage } from '../plan/PlanPage';
import { AutomaticSummary } from './AutomaticSummary';
import { NARRATIVE_STORAGE_KEY } from './narrativeCache';

const SESSION_ID = '017f22e2-79b0-7cc3-98c4-dc0c0c07398f';
const plan = es.plan;
const automatic = es.summary.automatic;

/** What the screens read from the sync provider: a status and, when signed in, the API. */
function cloud(status: CloudSyncStatus, api: Partial<CloudApi> | null): CloudSyncValue {
  return {
    status,
    error: null,
    revision: 0,
    consentAt: null,
    setConsent: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    api: api as CloudApi | null,
  };
}

function renderWith(value: CloudSyncValue, screenUnderTest: React.ReactNode): void {
  render(
    <CloudSyncContext value={value}>
      <MemoryRouter>{screenUnderTest}</MemoryRouter>
    </CloudSyncContext>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('plan proposed by the language model (RF-13)', () => {
  it('asks with the chosen goals, marks the note as generated and leaves the choice to the person', async () => {
    const user = userEvent.setup();
    const suggestPlan = vi.fn<CloudApi['suggestPlan']>(() => Promise.resolve({ durationMin: 30, note: 'Media hora va bien para descansar.' }));
    renderWith(cloud('needs_second_factor', { suggestPlan }), <PlanPage />);

    // Without a goal there is nothing to propose from.
    const ask = screen.getByRole('button', { name: plan.suggestion.ask });
    expect(ask).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: plan.goals.names.rest_before_sleep }));
    await user.click(ask);

    expect(suggestPlan).toHaveBeenCalledWith(['rest_before_sleep'], expect.any(Number), 'es');
    expect(await screen.findByText(plan.suggestion.proposal(plan.minutes(30)))).toBeVisible();
    expect(screen.getByText(plan.suggestion.generatedMark)).toBeVisible();
    // Nothing changes until the person accepts.
    expect(screen.getByRole('radio', { name: plan.minutes(20) })).toBeChecked();
    await user.click(screen.getByRole('button', { name: plan.suggestion.accept }));
    expect(screen.getByRole('radio', { name: plan.minutes(30) })).toBeChecked();
  });

  it('keeps the manual plan when the model is not available, and hides the offer without an API', async () => {
    const user = userEvent.setup();
    const suggestPlan = (): Promise<never> => Promise.reject(new CloudError('language_model_unavailable'));
    renderWith(cloud('synced', { suggestPlan }), <PlanPage />);
    await user.click(screen.getByRole('checkbox', { name: plan.goals.names.relax }));
    await user.click(screen.getByRole('button', { name: plan.suggestion.ask }));

    expect(await screen.findByText(plan.suggestion.failed(es.cloud.errors.language_model_unavailable))).toBeVisible();
    expect(screen.getByRole('button', { name: plan.continueToSession })).toBeEnabled();
  });

  it('offers nothing in a deployment without an API and points to signing in without an account', () => {
    renderWith(cloud('unavailable', null), <PlanPage />);
    expect(screen.queryByRole('button', { name: plan.suggestion.ask })).not.toBeInTheDocument();
    expect(screen.queryByText(plan.suggestion.signedOut)).not.toBeInTheDocument();
  });
});

describe('automatic summary (RF-15)', () => {
  it('sends nothing until the person agrees, then shows the text as generated and keeps it on the device', async () => {
    const user = userEvent.setup();
    const summarizeSession = vi.fn<CloudApi['summarizeSession']>(() => Promise.resolve({ text: 'Escuchaste 20 minutos.' }));
    renderWith(cloud('synced', { summarizeSession }), <AutomaticSummary sessionId={SESSION_ID} />);

    // What travels is said before the button.
    expect(screen.getByText(automatic.notice)).toBeVisible();
    expect(summarizeSession).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: automatic.ask }));

    expect(summarizeSession).toHaveBeenCalledWith(SESSION_ID, 'es');
    expect(await screen.findByTestId('narrative-text')).toHaveTextContent('Escuchaste 20 minutos.');
    expect(screen.getByText(automatic.generatedMark)).toBeVisible();
    expect(window.localStorage.getItem(NARRATIVE_STORAGE_KEY)).toContain('Escuchaste 20 minutos.');
  });

  it('shows a summary written earlier without asking again', () => {
    window.localStorage.setItem(NARRATIVE_STORAGE_KEY, JSON.stringify([
      { sessionId: SESSION_ID, locale: 'es', text: 'Tu pulso pasó de 78 a 68.' },
      { sessionId: SESSION_ID, locale: 'es', text: '' },
      'not an entry',
    ]));
    const summarizeSession = vi.fn<CloudApi['summarizeSession']>();
    renderWith(cloud('signed_out', null), <AutomaticSummary sessionId={SESSION_ID} />);

    expect(screen.getByTestId('narrative-text')).toHaveTextContent('Tu pulso pasó de 78 a 68.');
    expect(screen.getByText(automatic.generatedMark)).toBeVisible();
    expect(summarizeSession).not.toHaveBeenCalled();
  });

  it.each([
    ['signed_out', ROUTES.login],
    ['needs_second_factor', ROUTES.account],
    ['needs_consent', ROUTES.privacy],
  ] as const)('says what is missing when the status is %s', (status, route) => {
    renderWith(cloud(status, {}), <AutomaticSummary sessionId={SESSION_ID} />);
    expect(screen.getByText(automatic.needs[status], { exact: false })).toBeVisible();
    expect(screen.getByRole('link', { name: es.cloud.actions[status] })).toHaveAttribute('href', route);
    expect(screen.queryByRole('button', { name: automatic.ask })).not.toBeInTheDocument();
  });

  it('explains a session that is not in the account yet instead of a generic failure', async () => {
    const user = userEvent.setup();
    const summarizeSession = (): Promise<never> => Promise.reject(new CloudError('not_found'));
    renderWith(cloud('synced', { summarizeSession }), <AutomaticSummary sessionId={SESSION_ID} />);
    await user.click(screen.getByRole('button', { name: automatic.ask }));
    expect(await screen.findByText(automatic.notInCloud)).toBeVisible();
  });
});
