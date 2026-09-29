import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createFakeTimeEnvironment } from '../../test/fakeTimeEnvironment';
import { SourceChannel } from './sourceChannel';
import type { SignalSource } from './contract';
import { AcquisitionPanel, SIMULATOR_SEED, type CreateSimulatedSource } from './AcquisitionPanel';
import { SimulatedSource } from './simulator/SimulatedSource';

/** El panel es controlado: este arnés guarda la fuente como lo hace App. */
function StatefulPanel({ createSource }: { readonly createSource: CreateSimulatedSource }) {
  const [source, setSource] = useState<SignalSource | null>(null);
  return <AcquisitionPanel source={source} onSourceChange={setSource} createSource={createSource} />;
}

function renderWithFakeTime() {
  const env = createFakeTimeEnvironment();
  const createSource = vi.fn<CreateSimulatedSource>(
    (options) => new SimulatedSource({ ...options, clock: env.clock, scheduler: env.scheduler }),
  );
  const result = render(<StatefulPanel createSource={createSource} />);
  return { env, createSource, ...result };
}

function visibleState(): string {
  return screen.getByRole('status').textContent;
}

describe('PanelAdquisicion', () => {
  it('muestra el estado desconectado y los controles con etiqueta', () => {
    renderWithFakeTime();

    expect(screen.getByRole('heading', { level: 2, name: /fuente de señal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/escenario del simulador/i)).toBeEnabled();
    expect(screen.getByLabelText(/velocidad/i)).toBeEnabled();
    expect(visibleState()).toMatch(/desconectada/i);
    expect(screen.getByTestId('heart-rate')).toHaveTextContent('—');
  });

  it('ofrece los cuatro escenarios y las cuatro velocidades', () => {
    renderWithFakeTime();

    const scenarios = screen.getAllByRole('option').map((o) => o.textContent);
    expect(scenarios).toEqual([
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
    const { createSource } = renderWithFakeTime();

    await user.selectOptions(screen.getByLabelText(/escenario del simulador/i), 'activation');
    await user.selectOptions(screen.getByLabelText(/velocidad/i), '10');
    screen.getByRole('button', { name: /conectar simulador/i }).focus();
    await user.keyboard('{Enter}');

    expect(createSource).toHaveBeenCalledWith({
      scenario: 'activation',
      speed: 10,
      seed: SIMULATOR_SEED,
    });
    expect(visibleState()).toMatch(/conectada/i);
    expect(screen.getByLabelText(/escenario del simulador/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /desconectar/i })).toBeInTheDocument();
  });

  it('muestra la última lectura mientras llegan notificaciones', async () => {
    const user = userEvent.setup();
    const { env } = renderWithFakeTime();

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    act(() => {
      env.advance(3000);
    });

    expect(screen.getByTestId('heart-rate')).toHaveTextContent(/^\d+ lpm$/);
    expect(Number(screen.getByTestId('received-beats').textContent)).toBeGreaterThan(0);
    expect(screen.getByTestId('signal-time')).toHaveTextContent('00:03');
  });

  it('desconecta, detiene la fuente y vuelve a habilitar los controles', async () => {
    const user = userEvent.setup();
    const { env } = renderWithFakeTime();

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    await user.click(screen.getByRole('button', { name: /desconectar/i }));

    expect(visibleState()).toMatch(/desconectada/i);
    expect(env.active).toBe(false);
    expect(screen.getByLabelText(/escenario del simulador/i)).toBeEnabled();
  });

  it('detiene la fuente al desmontar el panel', async () => {
    const user = userEvent.setup();
    const { env, unmount } = renderWithFakeTime();

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    unmount();

    expect(env.active).toBe(false);
  });

  it('avisa, sin lenguaje clínico, cuando la fuente descarta una medición', async () => {
    const user = userEvent.setup();
    const channel = new SourceChannel();
    const source: SignalSource = {
      kind: 'simulator',
      get state() {
        return channel.state;
      },
      connect: () => {
        channel.changeState('connected');
        return Promise.resolve();
      },
      disconnect: () => {
        channel.changeState('disconnected');
        return Promise.resolve();
      },
      subscribe: (observer) => channel.subscribe(observer),
    };
    render(<StatefulPanel createSource={() => source} />);

    await user.click(screen.getByRole('button', { name: /conectar simulador/i }));
    act(() => {
      channel.notify({ timeMs: 1000, heartRate: 400, rrIntervalsMs: [], sensorContact: true });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/no es fiable/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/revisa la colocación del dispositivo/i);
  });
});
