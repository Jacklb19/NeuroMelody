import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, it, expect } from 'vitest';
import { WarningsContext } from '../features/warnings/warningsContext';
import { WARNINGS } from '../features/warnings/warningsText';
import { WarningsRegistry } from '../features/warnings/warningsRegistry';
import { readDuration } from '../features/plan/plan';
import { AppRoutes } from './AppRoutes';

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
  it('the home page links to the plan and the session; the navigation leaves out diagnostics', () => {
    renderWith('/');
    expect(screen.getByRole('heading', { level: 1, name: 'NeuroMelody' })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: /principal/i });
    const links = Array.from(navigation.querySelectorAll('a'), (a) => a.textContent);
    expect(links).toEqual(['Inicio', 'Plan', 'Sesión']);
    expect(screen.getByRole('link', { name: /preparar una sesión/i })).toHaveAttribute('href', '/plan');
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('offers a skip-to-content link', () => {
    renderWith('/');
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute('href', '#contenido');
  });

  it('requires the warnings before the session and returns to the requested session once accepted (RF-17)', async () => {
    const user = userEvent.setup();
    const { registry } = renderWith('/session?duration=30');

    expect(currentPath()).toBe('/warnings');
    const button = screen.getByRole('button', { name: /aceptar y continuar/i });
    expect(button).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    await user.click(button);

    expect(registry.isAccepted()).toBe(true);
    expect(currentPath()).toBe('/session?duration=30');
    expect(screen.getByRole('heading', { level: 1, name: 'Sesión' })).toBeInTheDocument();
    expect(screen.getByText(/plan: 30 minutos/i)).toBeInTheDocument();
  });

  it('with the warnings accepted it goes straight to the session and its panels', () => {
    renderWith('/session', true);
    expect(screen.getByText(/plan: 20 minutos/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /fuente de señal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /señal e indicadores/i })).toBeInTheDocument();
  });

  it('the plan lets the user pick the duration with the keyboard and passes it to the session', async () => {
    const user = userEvent.setup();
    renderWith('/plan', true);

    expect(screen.getByRole('radio', { name: '20 minutos' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '45 minutos' }));
    expect(screen.getByText('45 minutos', { selector: 'strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continuar a la sesión/i }));
    expect(currentPath()).toBe('/session?duration=45');
  });

  it('diagnostics stays reachable through its route', () => {
    renderWith('/diagnostics');
    expect(screen.getByRole('heading', { level: 1, name: /diagnóstico de la plataforma/i })).toBeInTheDocument();
  });

  it('an unknown route goes back home', () => {
    renderWith('/no-existe');
    expect(currentPath()).toBe('/');
  });

  it('sets a document title per screen', () => {
    renderWith('/plan');
    expect(document.title).toBe('Plan de sesión · NeuroMelody');
  });
});

describe('warnings (R-06)', () => {
  it('state the non-clinical, complementary nature from the definition document', () => {
    renderWith('/warnings');
    const text = document.body.textContent;
    expect(text).toMatch(/herramienta de bienestar y acompañamiento/i);
    expect(text).toMatch(/no es un dispositivo médico/i);
    expect(text).toMatch(/complementario al seguimiento de tu profesional de la salud/i);
    expect(text).toMatch(/no mide el dolor/i);
    expect(text).toMatch(/tecla esc/i);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(WARNINGS.length);
  });

  it('use no clinical language and make no therapeutic promises', () => {
    renderWith('/warnings');
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
    ['25', 20],
    ['abc', 20],
    ['', 20],
  ])('interpreta %j como %i minutos', (value, expected) => {
    expect(readDuration(value)).toBe(expected);
  });

  it('uses 20 minutes when there is no value', () => {
    expect(readDuration(null)).toBe(20);
  });
});
