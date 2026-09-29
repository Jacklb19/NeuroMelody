import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { crearEntornoAudioFalso, type ParametroFalso } from '../../../test/audioFalso';
import { MODO } from '../nucleo/teoria';
import { dbAGanancia } from '../motor/rampas';
import { PanelReproduccion } from './PanelReproduccion';

function preparar(duracionMin = 10) {
  const entorno = crearEntornoAudioFalso();
  const vista = render(
    <PanelReproduccion duracionMin={duracionMin} fabrica={entorno.fabrica} generarSemilla={() => 42} />,
  );
  const ganancias = () =>
    entorno.contexto.nodos.filter((n) => n.tipo === 'ganancia') as unknown as { gain: ParametroFalso }[];
  // Orden de creación en MotorAudio: reverberación, volumen, envolvente.
  const envolvente = () => ganancias()[2]?.gain;
  const volumen = () => ganancias()[1]?.gain;
  return { entorno, vista, envolvente, volumen };
}

const estado = () => screen.getByRole('status').textContent;
const botonDetener = () => screen.getByRole('button', { name: 'Detener' });

async function iniciar() {
  fireEvent.click(screen.getByRole('button', { name: /iniciar música/i }));
  await waitFor(() => {
    expect(estado()).toMatch(/sonando/i);
  });
}

function avanzarSegundoDeRevision() {
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
    preparar();
    expect(screen.getByText('Usa un volumen moderado en tu dispositivo.')).toBeInTheDocument();
    expect(botonDetener()).toBeVisible();
    expect(botonDetener()).toBeDisabled();
    expect(estado()).toMatch(/lista para empezar/i);
  });

  it('inicia en el nivel de calibración con −12 dB y agenda el fundido final en el reloj de audio', async () => {
    const { entorno, envolvente, volumen } = preparar(10);
    await iniciar();

    const sintetizador = entorno.worklets[0];
    expect(sintetizador?.opciones.processorOptions).toEqual({ semilla: 42, modoInicial: MODO.lidio, capasIniciales: 2 });
    expect(volumen()?.value).toBeCloseTo(dbAGanancia(-12), 10);
    expect(botonDetener()).toBeEnabled();
    // Plan de 10 min: aviso a los 600 s; sin respuesta, fundido de 720 a 740 s.
    expect(envolvente()?.eventos.slice(-2)).toEqual([
      { tipo: 'set', valor: 1, tiempo: 720 },
      { tipo: 'lineal', valor: 0, tiempo: 740 },
    ]);
  });

  it('ajusta el volumen dentro del rango y lo muestra', async () => {
    const { volumen } = preparar();
    await iniciar();
    fireEvent.change(screen.getByLabelText('Volumen'), { target: { value: '-20' } });
    expect(screen.getByText('-20 dB')).toBeInTheDocument();
    expect(volumen()?.ultimo('objetivo')?.valor).toBeCloseTo(dbAGanancia(-20), 10);
  });

  it('la tecla Esc detiene con una rampa de 50 ms (HU-06)', async () => {
    const { entorno, envolvente } = preparar();
    await iniciar();
    entorno.contexto.currentTime = 30;
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(estado()).toMatch(/detenida/i);
    expect(envolvente()?.ultimo('lineal')).toEqual({ tipo: 'lineal', valor: 0, tiempo: 30.05 });
    // La suspensión no cambia el DOM: waitFor no volvería a comprobar con setInterval simulado.
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 0));
    });
    expect(entorno.contexto.state).toBe('suspended');
  });

  it('el botón fijo Detener detiene la música', async () => {
    preparar();
    await iniciar();
    fireEvent.click(botonDetener());
    expect(estado()).toMatch(/detenida/i);
  });

  it('al terminar el plan avisa, y Esc no detiene mientras el aviso está abierto', async () => {
    const { entorno } = preparar(10);
    await iniciar();
    entorno.contexto.currentTime = 600;
    avanzarSegundoDeRevision();

    const aviso = screen.getByRole('alertdialog', { name: /la sesión planificada terminó/i });
    expect(aviso).toHaveTextContent(/se apagará en 2 minutos/i);
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(estado()).toMatch(/sonando/i);
  });

  it('continuar cancela el fundido y agenda el siguiente aviso a los 60 minutos', async () => {
    const { entorno, envolvente } = preparar(10);
    await iniciar();
    entorno.contexto.currentTime = 600;
    avanzarSegundoDeRevision();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(envolvente()?.ultimo('cancelar')?.tiempo).toBe(600);
    expect(envolvente()?.eventos.slice(-2)).toEqual([
      { tipo: 'set', valor: 1, tiempo: 3720 },
      { tipo: 'lineal', valor: 0, tiempo: 3740 },
    ]);

    entorno.contexto.currentTime = 3600;
    avanzarSegundoDeRevision();
    expect(screen.getByRole('alertdialog', { name: /60 minutos de escucha continua/i })).toBeInTheDocument();
  });

  it('sin respuesta, la sesión termina cuando acaba el fundido', async () => {
    const { entorno } = preparar(10);
    await iniciar();
    entorno.contexto.currentTime = 600;
    avanzarSegundoDeRevision();
    entorno.contexto.currentTime = 740;
    avanzarSegundoDeRevision();

    expect(estado()).toMatch(/la sesión terminó/i);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('terminar desde el aviso detiene la sesión', async () => {
    const { entorno } = preparar(10);
    await iniciar();
    entorno.contexto.currentTime = 600;
    avanzarSegundoDeRevision();
    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(estado()).toMatch(/la sesión terminó/i);
  });

  it('avisa si el audio no se puede iniciar', async () => {
    const entorno = crearEntornoAudioFalso();
    const fabrica = {
      ...entorno.fabrica,
      crearContexto: () => {
        throw new Error('AudioContext no disponible');
      },
    };
    render(<PanelReproduccion duracionMin={20} fabrica={fabrica} />);
    fireEvent.click(screen.getByRole('button', { name: /iniciar música/i }));
    await waitFor(() => {
      expect(estado()).toMatch(/no se pudo iniciar el audio/i);
    });
    expect(screen.getByText(/audiocontext no disponible/i)).toBeInTheDocument();
  });
});

describe('PanelReproduccion con Media Session', () => {
  const manejadores = new Map<string, (() => void) | null>();
  const sesion = {
    playbackState: 'none' as MediaSessionPlaybackState,
    metadata: null as MediaMetadata | null,
    setActionHandler: (accion: string, manejador: (() => void) | null) => {
      manejadores.set(accion, manejador);
    },
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaSession', { value: sesion, configurable: true });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaSession');
    manejadores.clear();
  });

  it('registra pausa y detener, refleja el estado y detiene desde el sistema', async () => {
    preparar();
    expect(manejadores.has('pause')).toBe(true);
    expect(manejadores.has('stop')).toBe(true);

    await iniciar();
    expect(sesion.playbackState).toBe('playing');

    act(() => {
      manejadores.get('stop')?.();
    });
    expect(estado()).toMatch(/detenida/i);
    expect(sesion.playbackState).toBe('paused');
  });
});
