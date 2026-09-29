import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { createFakeAudioEnvironment, type FakeParam } from '../../../test/fakeAudio';
import { MODE } from '../core/theory';
import { dbToGain } from '../engine/ramps';
import { PlaybackPanel } from './PlaybackPanel';

function setup(durationMin = 10) {
  const env = createFakeAudioEnvironment();
  const view = render(
    <PlaybackPanel durationMin={durationMin} factory={env.factory} generateSeed={() => 42} />,
  );
  const gains = () =>
    env.context.nodes.filter((n) => n.kind === 'gain') as unknown as { gain: FakeParam }[];
  // Orden de creación en MotorAudio: reverberación, volumen, envolvente.
  const envelope = () => gains()[2]?.gain;
  const volume = () => gains()[1]?.gain;
  return { env, view, envelope, volume };
}

const state = () => screen.getByRole('status').textContent;
const stopButton = () => screen.getByRole('button', { name: 'Detener' });

async function start() {
  fireEvent.click(screen.getByRole('button', { name: /iniciar música/i }));
  // With setInterval faked, waitFor only re-checks on DOM changes; under a loaded
  // parallel run the start chain can take longer than the default 1 s.
  await waitFor(
    () => {
      expect(state()).toMatch(/sonando/i);
    },
    { timeout: 5000 },
  );
  // Passive effects (the check interval) may still be pending after the DOM update.
  await act(async () => {
    await Promise.resolve();
  });
}

function advanceOneCheck() {
  act(() => {
    vi.advanceTimersByTime(1000);
  });
}

describe('PanelReproduccion', () => {
  beforeEach(() => {
    // Solo se simula el intervalo de revisión; waitFor sigue usando setTimeout real.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el aviso de volumen moderado y el botón Detener siempre visible', () => {
    setup();
    expect(screen.getByText('Usa un volumen moderado en tu dispositivo.')).toBeInTheDocument();
    expect(stopButton()).toBeVisible();
    expect(stopButton()).toBeDisabled();
    expect(state()).toMatch(/lista para empezar/i);
  });

  it('inicia en el nivel de calibración con −12 dB y agenda el fundido final en el reloj de audio', async () => {
    const { env, envelope, volume } = setup(10);
    await start();

    const synthesizer = env.worklets[0];
    expect(synthesizer?.options.processorOptions).toEqual({ seed: 42, initialMode: MODE.lydian, initialLayers: 2 });
    expect(volume()?.value).toBeCloseTo(dbToGain(-12), 10);
    expect(stopButton()).toBeEnabled();
    // Plan de 10 min: aviso a los 600 s; sin respuesta, fundido de 720 a 740 s.
    expect(envelope()?.events.slice(-2)).toEqual([
      { kind: 'set', value: 1, time: 720 },
      { kind: 'linear', value: 0, time: 740 },
    ]);
  });

  it('ajusta el volumen dentro del rango y lo muestra', async () => {
    const { volume } = setup();
    await start();
    fireEvent.change(screen.getByLabelText('Volumen'), { target: { value: '-20' } });
    expect(screen.getByText('-20 dB')).toBeInTheDocument();
    expect(volume()?.last('target')?.value).toBeCloseTo(dbToGain(-20), 10);
  });

  it('la tecla Esc detiene con una rampa de 50 ms (HU-06)', async () => {
    const { env, envelope } = setup();
    await start();
    env.context.currentTime = 30;
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(state()).toMatch(/detenida/i);
    expect(envelope()?.last('linear')).toEqual({ kind: 'linear', value: 0, time: 30.05 });
    // La suspensión no cambia el DOM: waitFor no volvería a comprobar con setInterval simulado.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(env.context.state).toBe('suspended');
  });

  it('el botón fijo Detener detiene la música', async () => {
    setup();
    await start();
    fireEvent.click(stopButton());
    expect(state()).toMatch(/detenida/i);
  });

  it('al terminar el plan avisa, y Esc no detiene mientras el aviso está abierto', async () => {
    const { env } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();

    const warning = screen.getByRole('alertdialog', { name: /la sesión planificada terminó/i });
    expect(warning).toHaveTextContent(/se apagará en 2 minutos/i);
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(state()).toMatch(/sonando/i);
  });

  it('continuar cancela el fundido y agenda el siguiente aviso a los 60 minutos', async () => {
    const { env, envelope } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(envelope()?.last('cancel')?.time).toBe(600);
    expect(envelope()?.events.slice(-2)).toEqual([
      { kind: 'set', value: 1, time: 3720 },
      { kind: 'linear', value: 0, time: 3740 },
    ]);

    env.context.currentTime = 3600;
    advanceOneCheck();
    expect(screen.getByRole('alertdialog', { name: /60 minutos de escucha continua/i })).toBeInTheDocument();
  });

  it('sin respuesta, la sesión termina cuando acaba el fundido', async () => {
    const { env } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();
    env.context.currentTime = 740;
    advanceOneCheck();

    expect(state()).toMatch(/la sesión terminó/i);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('terminar desde el aviso detiene la sesión', async () => {
    const { env } = setup(10);
    await start();
    env.context.currentTime = 600;
    advanceOneCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(state()).toMatch(/la sesión terminó/i);
  });

  it('avisa si el audio no se puede iniciar', async () => {
    const env = createFakeAudioEnvironment();
    const factory = {
      ...env.factory,
      createAudioContext: () => {
        throw new Error('AudioContext no disponible');
      },
    };
    render(<PlaybackPanel durationMin={20} factory={factory} />);
    fireEvent.click(screen.getByRole('button', { name: /iniciar música/i }));
    await waitFor(() => {
      expect(state()).toMatch(/no se pudo iniciar el audio/i);
    });
    expect(screen.getByText(/audiocontext no disponible/i)).toBeInTheDocument();
  });
});

describe('PanelReproduccion con Media Session', () => {
  const handlers = new Map<string, (() => void) | null>();
  const session = {
    playbackState: 'none' as MediaSessionPlaybackState,
    metadata: null as MediaMetadata | null,
    setActionHandler: (action: string, handler: (() => void) | null) => {
      handlers.set(action, handler);
    },
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaSession');
    handlers.clear();
  });

  it('registra pausa y detener, refleja el estado y detiene desde el sistema', async () => {
    setup();
    expect(handlers.has('pause')).toBe(true);
    expect(handlers.has('stop')).toBe(true);

    await start();
    expect(session.playbackState).toBe('playing');

    act(() => {
      handlers.get('stop')?.();
    });
    expect(state()).toMatch(/detenida/i);
    expect(session.playbackState).toBe('paused');
  });
});
