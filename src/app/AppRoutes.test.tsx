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

describe('rutas', () => {
  it('el inicio lleva al plan y a la sesión; la navegación no incluye el diagnóstico', () => {
    renderWith('/');
    expect(screen.getByRole('heading', { level: 1, name: 'NeuroMelody' })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: /principal/i });
    const links = Array.from(navigation.querySelectorAll('a'), (a) => a.textContent);
    expect(links).toEqual(['Inicio', 'Plan', 'Sesión']);
    expect(screen.getByRole('link', { name: /preparar una sesión/i })).toHaveAttribute('href', '/plan');
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('ofrece un enlace para saltar al contenido', () => {
    renderWith('/');
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute('href', '#contenido');
  });

  it('exige las advertencias antes de la sesión y vuelve a la sesión pedida al aceptarlas (RF-17)', async () => {
    const user = userEvent.setup();
    const { registry } = renderWith('/sesion?duracion=30');

    expect(currentPath()).toBe('/advertencias');
    const button = screen.getByRole('button', { name: /aceptar y continuar/i });
    expect(button).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    await user.click(button);

    expect(registry.isAccepted()).toBe(true);
    expect(currentPath()).toBe('/sesion?duracion=30');
    expect(screen.getByRole('heading', { level: 1, name: 'Sesión' })).toBeInTheDocument();
    expect(screen.getByText(/plan: 30 minutos/i)).toBeInTheDocument();
  });

  it('con las advertencias aceptadas entra directo a la sesión con sus paneles', () => {
    renderWith('/sesion', true);
    expect(screen.getByText(/plan: 20 minutos/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /fuente de señal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /señal e indicadores/i })).toBeInTheDocument();
  });

  it('el plan permite elegir la duración con el teclado y la lleva a la sesión', async () => {
    const user = userEvent.setup();
    renderWith('/plan', true);

    expect(screen.getByRole('radio', { name: '20 minutos' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '45 minutos' }));
    expect(screen.getByText('45 minutos', { selector: 'strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continuar a la sesión/i }));
    expect(currentPath()).toBe('/sesion?duracion=45');
  });

  it('el diagnóstico sigue accesible por su ruta', () => {
    renderWith('/diagnostico');
    expect(screen.getByRole('heading', { level: 1, name: /diagnóstico de la plataforma/i })).toBeInTheDocument();
  });

  it('una ruta desconocida vuelve al inicio', () => {
    renderWith('/no-existe');
    expect(currentPath()).toBe('/');
  });

  it('pone un título de documento por pantalla', () => {
    renderWith('/plan');
    expect(document.title).toBe('Plan de sesión · NeuroMelody');
  });
});

describe('advertencias (R-06)', () => {
  it('muestran el carácter no clínico y complementario del documento', () => {
    renderWith('/advertencias');
    const text = document.body.textContent;
    expect(text).toMatch(/herramienta de bienestar y acompañamiento/i);
    expect(text).toMatch(/no es un dispositivo médico/i);
    expect(text).toMatch(/complementario al seguimiento de tu profesional de la salud/i);
    expect(text).toMatch(/no mide el dolor/i);
    expect(text).toMatch(/tecla esc/i);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(WARNINGS.length);
  });

  it('no usan lenguaje clínico ni promesas terapéuticas', () => {
    renderWith('/advertencias');
    expect(document.body.textContent).not.toMatch(
      /diagnós|arritmi|anómal|ectópic|prematur|terapia|cura\b|alivia|reduce el dolor/i,
    );
  });
});

describe('leerDuracion', () => {
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

  it('usa 20 minutos si no hay valor', () => {
    expect(readDuration(null)).toBe(20);
  });
});
