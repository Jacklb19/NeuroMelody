import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { crearEntornoTiempoFalso } from '../../test/fakeTimeEnvironment';
import { CanalFuente } from './sourceChannel';
import type { FuenteSenal } from './contract';
import { PanelAdquisicion, SEMILLA_SIMULADOR, type CrearFuenteSimulada } from './AcquisitionPanel';
import { FuenteSimulada } from './simulator/SimulatedSource';

/** El panel es controlado: este arnés guarda la fuente como lo hace App. */
function PanelConEstado({ crearFuente }: { readonly crearFuente: CrearFuenteSimulada }) {
  const [fuente, setFuente] = useState<FuenteSenal | null>(null);
  return <PanelAdquisicion fuente={fuente} alCambiarFuente={setFuente} crearFuente={crearFuente} />;
}

function renderizarConTiempoFalso() {
  const entorno = crearEntornoTiempoFalso();
  const crearFuente = vi.fn<CrearFuenteSimulada>(
    (opciones) => new FuenteSimulada({ ...opciones, reloj: entorno.reloj, programador: entorno.programador }),
  );
  const resultado = render(<PanelConEstado crearFuente={crearFuente} />);
  return { entorno, crearFuente, ...resultado };
}

function estadoVisible(): string {
  return screen.getByRole('status').textContent;
}

describe('PanelAdquisicion', () => {
  it('muestra el estado desconectado y los controles con etiqueta', () => {
    renderizarConTiempoFalso();

    expect(screen.getByRole('heading', { level: 2, name: /fuente de señal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/escenario del simulador/i)).toBeEnabled();
    expect(screen.getByLabelText(/velocidad/i)).toBeEnabled();
    expect(estadoVisible()).toMatch(/desconectada/i);
    expect(screen.getByTestId('frecuencia-cardiaca')).toHaveTextContent('—');
  });

  it('ofrece los cuatro escenarios y las cuatro velocidades', () => {
    renderizarConTiempoFalso();

    const escenarios = screen.getAllByRole('option').map((o) => o.textContent);
    expect(escenarios).toEqual([
      'Reposo',
      'Activación',
      'Relajación progresiva',
      'Reposo con fallos de lectura',
      '1×',
      '2×',
      '5×',
      '10×',
    ]);
  });

  it('conecta con el teclado usando el escenario y la velocidad elegidos', async () => {
    const user = userEvent.setup();
    const { crearFuente } = renderizarConTiempoFalso();

    await user.selectOptions(screen.getByLabelText(/escenario del simulador/i), 'activacion');
    await user.selectOptions(screen.getByLabelText(/velocidad/i), '10');
    screen.getByRole('button', { name: /conectar simulador/i }).focus();
    await user.keyboard('{Enter}');

    expect(crearFuente).toHaveBeenCalledWith({
      escenario: 'activacion',
      velocidad: 10,
      semilla: SEMILLA_SIMULADOR,
    });
    expect(estadoVisible()).toMatch(/conectada/i);
    expect(screen.getByLabelText(/escenario del simulador/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /desconectar/i })).toBeInTheDocument();
  });

  it('muestra la última lectura mientras llegan notificaciones', async () => {
    const user = userEvent.setup();
    const { entorno } = renderizarConTiempoFalso();

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    act(() => {
      entorno.avanzar(3000);
    });

    expect(screen.getByTestId('frecuencia-cardiaca')).toHaveTextContent(/^\d+ lpm$/);
    expect(Number(screen.getByTestId('latidos-recibidos').textContent)).toBeGreaterThan(0);
    expect(screen.getByTestId('tiempo-senal')).toHaveTextContent('00:03');
  });

  it('desconecta, detiene la fuente y vuelve a habilitar los controles', async () => {
    const user = userEvent.setup();
    const { entorno } = renderizarConTiempoFalso();

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    await user.click(screen.getByRole('button', { name: /desconectar/i }));

    expect(estadoVisible()).toMatch(/desconectada/i);
    expect(entorno.activa).toBe(false);
    expect(screen.getByLabelText(/escenario del simulador/i)).toBeEnabled();
  });

  it('detiene la fuente al desmontar el panel', async () => {
    const user = userEvent.setup();
    const { entorno, unmount } = renderizarConTiempoFalso();

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    unmount();

    expect(entorno.activa).toBe(false);
  });

  it('avisa, sin lenguaje clínico, cuando la fuente descarta una medición', async () => {
    const user = userEvent.setup();
    const canal = new CanalFuente();
    const fuente: FuenteSenal = {
      tipo: 'simulador',
      get estado() {
        return canal.estado;
      },
      conectar: () => {
        canal.cambiarEstado('conectada');
        return Promise.resolve();
      },
      desconectar: () => {
        canal.cambiarEstado('desconectada');
        return Promise.resolve();
      },
      suscribir: (observador) => canal.suscribir(observador),
    };
    render(<PanelConEstado crearFuente={() => fuente} />);

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    act(() => {
      canal.notificar({ tiempoMs: 1000, frecuenciaCardiaca: 400, intervalosRRms: [], contactoSensor: true });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/no es fiable/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/revisa la colocación del dispositivo/i);
  });
});
