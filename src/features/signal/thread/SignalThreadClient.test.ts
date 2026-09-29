import { describe, it, expect, vi } from 'vitest';
import { crearEntornoTiempoFalso } from '../../../test/fakeTimeEnvironment';
import { ContextoDibujoFalso } from '../../../test/fakeDrawingContext';
import { crearPuertoEnProceso } from '../../../test/inProcessThreadPort';
import { FuenteSimulada } from '../../acquisition/simulator/SimulatedSource';
import type { ResultadoIndices } from '../processing/SignalProcessor';
import { ClienteHiloSenal } from './SignalThreadClient';

function crearEscena() {
  const entorno = crearEntornoTiempoFalso();
  const fuente = new FuenteSimulada({ escenario: 'reposo', semilla: 1, velocidad: 10, ...entorno });
  const puerto = crearPuertoEnProceso();
  const cliente = new ClienteHiloSenal(puerto);
  const resultados: ResultadoIndices[] = [];
  const alError = vi.fn();
  cliente.suscribir({ alIndices: (r) => resultados.push(r), alError });
  return { entorno, fuente, puerto, cliente, resultados, alError };
}

describe('ClienteHiloSenal', () => {
  it('reenvía las notificaciones al hilo de señal y reparte los índices', async () => {
    const { entorno, fuente, puerto, cliente, resultados } = crearEscena();
    cliente.conectarFuente(fuente);
    await fuente.conectar();
    entorno.avanzar(1000); // 10 s de señal

    expect(puerto.enviados.filter((m) => m.tipo === 'notificacion')).toHaveLength(10);
    expect(resultados.map((r) => r.tiempoMs)).toEqual([5000, 10000]);
  });

  it('reinicia el hilo de señal al conectar la fuente y en cada nueva conexión', async () => {
    const { entorno, fuente, puerto, cliente, resultados } = crearEscena();
    cliente.conectarFuente(fuente);
    await fuente.conectar();
    entorno.avanzar(1000);
    await fuente.desconectar();
    resultados.length = 0;

    await fuente.conectar();
    entorno.avanzar(500);

    expect(puerto.enviados.filter((m) => m.tipo === 'reiniciar')).toHaveLength(3);
    // Tras reiniciar, la cadencia vuelve a empezar en 5 s.
    expect(resultados.map((r) => r.tiempoMs)).toEqual([5000]);
  });

  it('deja de reenviar al desconectar la fuente del cliente', async () => {
    const { entorno, fuente, puerto, cliente } = crearEscena();
    const desconectarFuente = cliente.conectarFuente(fuente);
    await fuente.conectar();
    entorno.avanzar(300);
    desconectarFuente();
    entorno.avanzar(1000);

    expect(puerto.enviados.filter((m) => m.tipo === 'notificacion')).toHaveLength(3);
  });

  it('avisa de los errores del hilo y de las respuestas no reconocidas', () => {
    const { puerto, alError, resultados } = crearEscena();
    puerto.recibirDesdeHilo({ tipo: 'error', mensaje: 'falló el cálculo' });
    puerto.recibirDesdeHilo({ tipo: 'indices', resultado: { calidad: 'buena' } });

    expect(alError.mock.calls).toEqual([
      ['falló el cálculo'],
      ['Respuesta no reconocida del hilo de señal.'],
    ]);
    expect(resultados).toEqual([]);
  });

  it('el hilo de señal responde con un error ante un mensaje inválido', () => {
    const { puerto, alError } = crearEscena();
    // Se salta el tipado a propósito para simular un mensaje corrupto.
    puerto.enviar(JSON.parse('{"tipo":"borrar"}') as never);
    expect(alError).toHaveBeenCalledWith('Mensaje no reconocido por el hilo de señal.');
  });

  it('terminar cierra el puerto y olvida a los observadores', () => {
    const { puerto, cliente, alError } = crearEscena();
    cliente.terminar();
    puerto.recibirDesdeHilo({ tipo: 'error', mensaje: 'tarde' });

    expect(puerto.terminado).toBe(true);
    expect(alError).not.toHaveBeenCalled();
  });

  it('transfiere el lienzo con la paleta y reenvía los cambios de tamaño', () => {
    const { puerto, cliente, alError } = crearEscena();
    const contexto = new ContextoDibujoFalso();
    // jsdom no tiene OffscreenCanvas: basta un objeto con la misma forma.
    const lienzo = { width: 0, height: 0, getContext: () => contexto } as unknown as OffscreenCanvas;
    const paleta = {
      linea: 'a',
      rejilla: 'b',
      texto: 'c',
      descartado: 'd',
      bajaCalidadFondo: 'e',
      bajaCalidadRayado: 'f',
      fuente: '14px sans-serif',
    };

    cliente.adjuntarLienzo(lienzo, paleta, { anchoCss: 300, altoCss: 100, escala: 2 });
    cliente.redimensionar({ anchoCss: 400, altoCss: 100, escala: 2 });

    expect(puerto.enviados.map((m) => m.tipo)).toEqual(['iniciar-lienzo', 'redimensionar']);
    expect(lienzo.width).toBe(800);
    expect(contexto.contar('clearRect')).toBe(2);
    expect(alError).not.toHaveBeenCalled();
  });

  it('da de baja a un observador', () => {
    const { puerto, cliente } = crearEscena();
    const alError = vi.fn();
    const baja = cliente.suscribir({ alError });
    baja();
    puerto.recibirDesdeHilo({ tipo: 'error', mensaje: 'x' });
    expect(alError).not.toHaveBeenCalled();
  });
});
