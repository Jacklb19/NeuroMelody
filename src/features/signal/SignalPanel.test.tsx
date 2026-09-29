import { act, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ContextoDibujoFalso } from '../../test/fakeDrawingContext';
import { crearEntornoTiempoFalso } from '../../test/fakeTimeEnvironment';
import { crearPuertoEnProceso } from '../../test/inProcessThreadPort';
import type { IdEscenario } from '../acquisition/simulator/scenarios';
import { FuenteSimulada } from '../acquisition/simulator/SimulatedSource';
import { ErrorPaletaGrafica, type PaletaGrafica } from './drawing/palette';
import { ClienteHiloSenal } from './thread/SignalThreadClient';
import { PanelSenal } from './SignalPanel';

const PALETA: PaletaGrafica = {
  linea: 'rgb(1, 1, 1)',
  rejilla: 'rgb(2, 2, 2)',
  texto: 'rgb(3, 3, 3)',
  descartado: 'rgb(4, 4, 4)',
  bajaCalidadFondo: 'rgb(5, 5, 5)',
  bajaCalidadRayado: 'rgb(6, 6, 6)',
  fuente: '14px sans-serif',
};

function crearEscena(escenario: IdEscenario = 'reposo', leerPaleta: () => PaletaGrafica = () => PALETA) {
  const entorno = crearEntornoTiempoFalso();
  const fuente = new FuenteSimulada({ escenario, semilla: 1, velocidad: 10, ...entorno });
  const puerto = crearPuertoEnProceso();
  const cliente = new ClienteHiloSenal(puerto);
  const crearCliente = () => cliente;
  const contexto = new ContextoDibujoFalso();
  // jsdom no tiene OffscreenCanvas: basta un objeto con la misma forma.
  const transferirLienzo = () =>
    ({ width: 0, height: 0, getContext: () => contexto }) as unknown as OffscreenCanvas;
  const props = { crearCliente, leerPaleta, transferirLienzo };
  const vista = render(<PanelSenal fuente={null} {...props} />);

  return {
    entorno,
    fuente,
    puerto,
    contexto,
    vista,
    async conectar() {
      vista.rerender(<PanelSenal fuente={fuente} {...props} />);
      await act(async () => {
        await fuente.conectar();
      });
    },
    avanzarSegundosSenal(segundos: number) {
      act(() => {
        entorno.avanzar((segundos * 1000) / 10);
      });
    },
  };
}

function calidadVisible(): string {
  return screen.getByRole('status').textContent;
}

describe('PanelSenal', () => {
  it('sin Worker ni lienzo transferible avisa y mantiene los indicadores en texto', () => {
    render(<PanelSenal fuente={null} />);

    expect(screen.getByRole('heading', { level: 2, name: /señal e indicadores/i })).toBeInTheDocument();
    expect(screen.getByText(/el análisis de la señal no está disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/la gráfica no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(calidadVisible()).toMatch(/esperando datos de la señal/i);
    expect(screen.getByTestId('rmssd')).toHaveTextContent('—');
  });

  it('muestra "reuniendo datos" y luego los índices en texto', async () => {
    const escena = crearEscena();
    await escena.conectar();

    escena.avanzarSegundosSenal(30);
    expect(calidadVisible()).toMatch(/reuniendo datos/i);
    expect(screen.getByTestId('fc-media')).toHaveTextContent('—');
    expect(screen.getByTestId('ventana')).toHaveTextContent('0:30 de 5:00');

    escena.avanzarSegundosSenal(40);
    expect(calidadVisible()).toMatch(/buena/i);
    expect(screen.getByTestId('fc-media')).toHaveTextContent(/^\d+ lpm$/);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/^\d+ ms$/);
    expect(screen.getByTestId('sdnn')).toHaveTextContent(/^\d+ ms$/);
    expect(Number(screen.getByTestId('aceptados').textContent)).toBeGreaterThan(60);
    expect(screen.getByTestId('descartados')).toHaveTextContent('0');
  });

  it('la gráfica tiene nombre accesible, apunta al resumen en texto y se dibuja con la paleta', async () => {
    const escena = crearEscena();
    await escena.conectar();
    escena.avanzarSegundosSenal(10);

    const grafica = screen.getByRole('img', { name: /tacograma/i });
    const resumen = document.getElementById(grafica.getAttribute('aria-describedby') ?? '');
    expect(resumen?.tagName).toBe('DL');
    expect(grafica.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    expect(escena.contexto.contar('stroke', (o) => o.strokeStyle === PALETA.linea)).toBeGreaterThan(0);
  });

  it('con una variable de la paleta ausente oculta solo la gráfica', async () => {
    const escena = crearEscena('reposo', () => {
      throw new ErrorPaletaGrafica('Falta la variable CSS --color-grafica-linea.');
    });
    await escena.conectar();
    escena.avanzarSegundosSenal(70);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/--color-grafica-linea/)).toBeInTheDocument();
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/^\d+ ms$/);
  });

  it('avisa la baja calidad en texto y usa un vocabulario no clínico', async () => {
    const escena = crearEscena('artefactos');
    await escena.conectar();
    escena.avanzarSegundosSenal(95); // pérdida de contacto entre 90 y 95 s
    expect(calidadVisible()).toMatch(/baja: revisa la colocación del dispositivo/i);

    escena.avanzarSegundosSenal(205);
    expect(calidadVisible()).toMatch(/buena/i);
    expect(Number(screen.getByTestId('descartados').textContent)).toBeGreaterThan(0);
    expect(screen.getByText(/descartados por calidad de señal/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/anómal|prematur|ectópic|arritmi/i);
  });

  it('no muestra resultados de una fuente anterior', async () => {
    const escena = crearEscena();
    await escena.conectar();
    escena.avanzarSegundosSenal(70);
    expect(screen.getByTestId('rmssd')).toHaveTextContent(/ms/);

    escena.vista.rerender(<PanelSenal fuente={null} crearCliente={() => new ClienteHiloSenal(crearPuertoEnProceso())} />);
    expect(calidadVisible()).toMatch(/esperando datos/i);
    expect(screen.getByTestId('rmssd')).toHaveTextContent('—');
  });

  it('al desmontarse termina el hilo de señal y retira el lienzo', async () => {
    const escena = crearEscena();
    await escena.conectar();
    const contenedor = screen.getByRole('img');
    escena.vista.unmount();

    expect(escena.puerto.terminado).toBe(true);
    expect(contenedor.querySelector('canvas')).toBeNull();
  });
});
