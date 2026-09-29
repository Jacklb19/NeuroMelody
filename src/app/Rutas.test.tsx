import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, it, expect } from 'vitest';
import { ContextoAdvertencias } from '../features/advertencias/contextoAdvertencias';
import { ADVERTENCIAS } from '../features/advertencias/textoAdvertencias';
import { RegistroAdvertencias } from '../features/advertencias/registroAdvertencias';
import { leerDuracion } from '../features/plan/plan';
import { Rutas } from './Rutas';

function UbicacionActual() {
  const { pathname, search } = useLocation();
  return <output data-testid="ubicacion">{`${pathname}${search}`}</output>;
}

function renderizar(ruta: string, aceptadas = false) {
  const registro = new RegistroAdvertencias(null);
  if (aceptadas) {
    registro.aceptar(new Date());
  }
  render(
    <ContextoAdvertencias.Provider value={registro}>
      <MemoryRouter initialEntries={[ruta]}>
        <Rutas />
        <UbicacionActual />
      </MemoryRouter>
    </ContextoAdvertencias.Provider>,
  );
  return { registro };
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;

describe('rutas', () => {
  it('el inicio lleva al plan y a la sesión; la navegación no incluye el diagnóstico', () => {
    renderizar('/');
    expect(screen.getByRole('heading', { level: 1, name: 'NeuroMelody' })).toBeInTheDocument();
    const navegacion = screen.getByRole('navigation', { name: /principal/i });
    const enlaces = Array.from(navegacion.querySelectorAll('a'), (a) => a.textContent);
    expect(enlaces).toEqual(['Inicio', 'Plan', 'Sesión']);
    expect(screen.getByRole('link', { name: /preparar una sesión/i })).toHaveAttribute('href', '/plan');
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('ofrece un enlace para saltar al contenido', () => {
    renderizar('/');
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute('href', '#contenido');
  });

  it('exige las advertencias antes de la sesión y vuelve a la sesión pedida al aceptarlas (RF-17)', async () => {
    const user = userEvent.setup();
    const { registro } = renderizar('/sesion?duracion=30');

    expect(ubicacion()).toBe('/advertencias');
    const boton = screen.getByRole('button', { name: /aceptar y continuar/i });
    expect(boton).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    await user.click(boton);

    expect(registro.aceptadas()).toBe(true);
    expect(ubicacion()).toBe('/sesion?duracion=30');
    expect(screen.getByRole('heading', { level: 1, name: 'Sesión' })).toBeInTheDocument();
    expect(screen.getByText(/plan: 30 minutos/i)).toBeInTheDocument();
  });

  it('con las advertencias aceptadas entra directo a la sesión con sus paneles', () => {
    renderizar('/sesion', true);
    expect(screen.getByText(/plan: 20 minutos/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /fuente de señal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /señal e indicadores/i })).toBeInTheDocument();
  });

  it('el plan permite elegir la duración con el teclado y la lleva a la sesión', async () => {
    const user = userEvent.setup();
    renderizar('/plan', true);

    expect(screen.getByRole('radio', { name: '20 minutos' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '45 minutos' }));
    expect(screen.getByText('45 minutos', { selector: 'strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continuar a la sesión/i }));
    expect(ubicacion()).toBe('/sesion?duracion=45');
  });

  it('el diagnóstico sigue accesible por su ruta', () => {
    renderizar('/diagnostico');
    expect(screen.getByRole('heading', { level: 1, name: /diagnóstico de la plataforma/i })).toBeInTheDocument();
  });

  it('una ruta desconocida vuelve al inicio', () => {
    renderizar('/no-existe');
    expect(ubicacion()).toBe('/');
  });

  it('pone un título de documento por pantalla', () => {
    renderizar('/plan');
    expect(document.title).toBe('Plan de sesión · NeuroMelody');
  });
});

describe('advertencias (R-06)', () => {
  it('muestran el carácter no clínico y complementario del documento', () => {
    renderizar('/advertencias');
    const texto = document.body.textContent;
    expect(texto).toMatch(/herramienta de bienestar y acompañamiento/i);
    expect(texto).toMatch(/no es un dispositivo médico/i);
    expect(texto).toMatch(/complementario al seguimiento de tu profesional de la salud/i);
    expect(texto).toMatch(/no mide el dolor/i);
    expect(texto).toMatch(/tecla esc/i);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(ADVERTENCIAS.length);
  });

  it('no usan lenguaje clínico ni promesas terapéuticas', () => {
    renderizar('/advertencias');
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
  ])('interpreta %j como %i minutos', (valor, esperado) => {
    expect(leerDuracion(valor)).toBe(esperado);
  });

  it('usa 20 minutos si no hay valor', () => {
    expect(leerDuracion(null)).toBe(20);
  });
});
