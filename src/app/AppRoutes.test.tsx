import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { act } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { APP_NAME } from '../config/app';
import { ROUTES, sessionPath } from '../config/routes';
import { es } from '../i18n/es';
import { WarningsContext } from '../features/warnings/warningsContext';
import { WarningsRegistry } from '../features/warnings/warningsRegistry';
import { DEFAULT_DURATION_MIN, readDuration } from '../features/plan/plan';
import { STOP_SHORTCUT_KEY } from '../features/audio/ui/stopShortcut';
import { AuthProvider } from '../features/account/AuthProvider';
import type { AuthService } from '../features/account/authService';
import { SESSION_CHECK_TIMEOUT_MS } from '../features/account/config';
import { fakeAuthService } from '../test/fakeAuthService';
import { AppRoutes } from './AppRoutes';
import { MAIN_CONTENT_ID } from './Layout';

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output data-testid="current-path">{`${pathname}${search}`}</output>;
}

interface AccountSetup {
  /** No account service by default: the screens behave as for someone without an account. */
  readonly loadService?: () => Promise<AuthService | null>;
  /** Whether this browser seems to keep a session, so the app waits to know who it is. */
  readonly expectSession?: () => boolean;
}

function renderWith(route: string, accepted = false, account: AccountSetup = {}) {
  const registry = new WarningsRegistry(null);
  if (accepted) {
    registry.accept(new Date());
  }
  render(
    <WarningsContext.Provider value={registry}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider loadService={account.loadService ?? (() => Promise.resolve(null))} expectSession={account.expectSession ?? (() => false)}>
          <AppRoutes />
        </AuthProvider>
        <CurrentLocation />
      </MemoryRouter>
    </WarningsContext.Provider>,
  );
  return { registry };
}

const currentPath = () => screen.getByTestId('current-path').textContent;

describe('routes', () => {
  it('the landing page explains the app and leads into it', () => {
    renderWith(ROUTES.home);
    expect(screen.getByRole('heading', { level: 1, name: es.landing.hero.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: es.landing.hero.start })).toHaveAttribute('href', ROUTES.register);
    expect(screen.getByRole('link', { name: es.landing.nav.signIn })).toHaveAttribute('href', ROUTES.login);
    expect(screen.getByText(es.landing.hero.note)).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('the app home starts a session and opens the plan; the profile sits apart from the navigation', () => {
    renderWith(ROUTES.app);
    expect(screen.getByRole('heading', { level: 2, name: es.home.start.title(DEFAULT_DURATION_MIN) })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: es.app.mainNavigation });
    const links = Array.from(navigation.querySelectorAll('a'), (a) => a.textContent);
    const labels = es.app.navigation;
    expect(links).toEqual([labels.home, labels.plan, labels.session, labels.history]);
    expect(screen.getByRole('link', { name: es.home.start.customize })).toHaveAttribute('href', ROUTES.plan);
    expect(screen.getByRole('link', { name: es.app.profile })).toHaveAttribute('href', ROUTES.account);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('offers a skip-to-content link', () => {
    renderWith(ROUTES.app);
    expect(screen.getByRole('link', { name: es.app.skipToContent })).toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
    expect(screen.getByRole('main')).toHaveAttribute('id', MAIN_CONTENT_ID);
  });

  it('requires the warnings before the session and returns to the requested session once accepted (RF-17)', async () => {
    const user = userEvent.setup();
    const { registry } = renderWith(sessionPath(30));

    expect(currentPath()).toBe(ROUTES.warnings);
    const button = screen.getByRole('button', { name: es.warnings.accept });
    expect(button).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    await user.click(button);

    expect(registry.isAccepted()).toBe(true);
    expect(currentPath()).toBe(sessionPath(30));
    expect(screen.getByRole('heading', { level: 1, name: es.session.title })).toBeInTheDocument();
    expect(screen.getByText(es.session.plan(30))).toBeInTheDocument();
  });

  it('with the warnings accepted it goes straight to the session and its panels', () => {
    renderWith(ROUTES.session, true);
    expect(screen.getByText(es.session.plan(DEFAULT_DURATION_MIN))).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: es.session.narrative.noSource.title })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: es.session.progress.label })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: es.acquisition.title })).toBeInTheDocument();
    // Signal figures stay folded under the technical details (ADR-24).
    expect(screen.getByText(es.session.technicalDetails.title)).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: es.signal.title, hidden: true })).toBeInTheDocument();
  });

  it('the plan lets the user pick the duration with the keyboard and passes it to the session', async () => {
    const user = userEvent.setup();
    renderWith(ROUTES.plan, true);

    expect(screen.getByRole('radio', { name: es.plan.minutes(DEFAULT_DURATION_MIN) })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: es.plan.minutes(45) }));
    expect(screen.getByText(es.plan.minutes(45), { selector: 'strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: es.plan.continueToSession }));
    expect(currentPath()).toBe(sessionPath(45));
  });

  it('diagnostics stays reachable through its route', () => {
    renderWith(ROUTES.diagnostics);
    expect(screen.getByRole('heading', { level: 1, name: es.diagnostics.pageTitle })).toBeInTheDocument();
  });

  it('an unknown route goes back home', () => {
    renderWith('/does-not-exist');
    expect(currentPath()).toBe(ROUTES.home);
  });

  it('sets a document title per screen', () => {
    renderWith(ROUTES.plan);
    expect(document.title).toBe(`${es.plan.pageTitle} · ${APP_NAME}`);
  });
});

describe('two-step verification on the way into the app', () => {
  const homeTitle = es.home.start.title(DEFAULT_DURATION_MIN);
  const appIsHidden = (): void => {
    expect(screen.queryByRole('heading', { level: 2, name: homeTitle })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: es.app.mainNavigation })).not.toBeInTheDocument();
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing of the app while a kept session is read, then asks for the code', async () => {
    let deliver: (service: AuthService) => void = () => undefined;
    const loading = new Promise<AuthService | null>((resolve) => { deliver = resolve; });
    renderWith(ROUTES.app, false, { loadService: () => loading, expectSession: () => true });
    appIsHidden();

    deliver(fakeAuthService({}, { id: 'user-1', email: 'persona@example.test', name: null }, { current: 'aal1', next: 'aal2' }));
    expect(await screen.findByRole('heading', { name: es.account.totp.challengeTitle })).toBeInTheDocument();
    expect(currentPath()).toBe(ROUTES.login);
    appIsHidden();
  });

  it('stops waiting when the account service does not answer', () => {
    vi.useFakeTimers();
    renderWith(ROUTES.app, false, { loadService: () => new Promise(() => undefined), expectSession: () => true });
    appIsHidden();

    act(() => { vi.advanceTimersByTime(SESSION_CHECK_TIMEOUT_MS); });
    expect(screen.getByRole('heading', { level: 2, name: homeTitle })).toBeInTheDocument();
  });

  it('never waits when this browser keeps no session', () => {
    renderWith(ROUTES.app, false, { loadService: () => new Promise(() => undefined) });
    expect(screen.getByRole('heading', { level: 2, name: homeTitle })).toBeInTheDocument();
  });
});

describe('warnings (R-06)', () => {
  it('state the non-clinical, complementary nature from the definition document', () => {
    renderWith(ROUTES.warnings);
    const text = document.body.textContent;
    expect(text).toMatch(/herramienta de bienestar y acompañamiento/i);
    expect(text).toMatch(/no es un dispositivo médico/i);
    expect(text).toMatch(/complementario al seguimiento de tu profesional de la salud/i);
    expect(text).toMatch(/no mide el dolor/i);
    expect(text).toMatch(/tecla esc/i);
    // Every fixed warning and the stop hint, built from the real stop button label and key, is listed.
    const stopHint = es.warnings.stopHint(es.audio.playback.stop, es.warnings.keyNames[STOP_SHORTCUT_KEY]);
    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(listItems).toEqual(expect.arrayContaining([...es.warnings.items, stopHint]));
  });

  it('use no clinical language and make no therapeutic promises', () => {
    renderWith(ROUTES.warnings);
    expect(document.body.textContent).not.toMatch(
      /diagnós|arritmi|anómal|ectópic|prematur|terapia|cura\b|alivia|reduce el dolor/i,
    );
  });
});

describe('readDuration', () => {
  it.each([
    ['30', 30],
    ['10', 10],
    ['60', 60],
    ['30.0', 30],
    [' 30', 30],
    ['25', DEFAULT_DURATION_MIN],
    ['abc', DEFAULT_DURATION_MIN],
    ['', DEFAULT_DURATION_MIN],
  ])('reads %j as %i minutes', (value, expected) => {
    expect(readDuration(value)).toBe(expected);
  });

  it('uses the default plan when there is no value', () => {
    expect(readDuration(null)).toBe(DEFAULT_DURATION_MIN);
  });
});
