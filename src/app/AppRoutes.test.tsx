import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../config/app';
import { ROUTES, sessionPath } from '../config/routes';
import { es } from '../i18n/es';
import { WarningsContext } from '../features/warnings/warningsContext';
import { WarningsRegistry } from '../features/warnings/warningsRegistry';
import { DEFAULT_DURATION_MIN, readDuration } from '../features/plan/plan';
import { STOP_SHORTCUT_KEY } from '../features/audio/ui/stopShortcut';
import { AppRoutes } from './AppRoutes';
import { MAIN_CONTENT_ID } from './Layout';

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output data-testid="current-path">{`${pathname}${search}`}</output>;
}

function renderWith(route: string, accepted = false) {
  const registry = new WarningsRegistry(null);
  if (accepted) {
    registry.accept(new Date());
  }
  render(
    <WarningsContext.Provider value={registry}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
        <CurrentLocation />
      </MemoryRouter>
    </WarningsContext.Provider>,
  );
  return { registry };
}

const currentPath = () => screen.getByTestId('current-path').textContent;

describe('routes', () => {
  it('the home page links to the plan; the navigation leaves out diagnostics', () => {
    renderWith(ROUTES.home);
    expect(screen.getByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: es.app.mainNavigation });
    const links = Array.from(navigation.querySelectorAll('a'), (a) => a.textContent);
    const labels = es.app.navigation;
    expect(links).toEqual([labels.home, labels.plan, labels.session, labels.history]);
    expect(screen.getByRole('link', { name: es.home.prepareSession })).toHaveAttribute('href', ROUTES.plan);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('offers a skip-to-content link', () => {
    renderWith(ROUTES.home);
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
