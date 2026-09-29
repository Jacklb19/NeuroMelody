import { describe, it, expect } from 'vitest';
import { crearEntornoAudioFalso, type NodoFalso, type ParametroFalso } from '../../../test/audioFalso';
import { EscritorTelemetria, crearBuferTelemetria } from '../telemetria/anilloTelemetria';
import { MODO } from '../nucleo/teoria';
import { NOMBRE_RECORTADOR, NOMBRE_SINTETIZADOR } from '../worklet/contratoWorklet';
import { FUNDIDO_FINAL_S, LIMITADOR, MotorAudio, RAMPA_DETENCION_S } from './MotorAudio';
import { DURACION_RAMPA_TIMBRE_S, dbAGanancia } from './rampas';

async function crearMotor(salidaPorElementoAudio = false, telemetria: SharedArrayBuffer | null = null) {
  const entorno = crearEntornoAudioFalso(telemetria);
  const motor = await MotorAudio.crear(entorno.fabrica, {
    semilla: 7,
    nivelInicial: 'intermedio',
    salidaPorElementoAudio,
  });
  const [sintetizador, recortador] = entorno.worklets;
  if (sintetizador === undefined || recortador === undefined) {
    throw new Error('No se crearon los worklets');
  }
  const nodosDeTipo = (tipo: string) => entorno.contexto.nodos.filter((n) => n.tipo === tipo);
  const param = (nombre: string) => sintetizador.parameters.get(nombre) as ParametroFalso;
  const [volumen, humedo, envolvente] = [nodosDeTipo('ganancia')[1], nodosDeTipo('ganancia')[0], nodosDeTipo('ganancia')[2]] as unknown as { gain: ParametroFalso }[];
  const filtro = nodosDeTipo('filtro')[0] as unknown as { frequency: ParametroFalso; type: string };
  return { entorno, motor, sintetizador, recortador, param, volumen, humedo, envolvente, filtro, nodosDeTipo };
}

/** Recorre el grafo desde un nodo siguiendo la primera conexión. */
function cadena(desde: NodoFalso): string[] {
  const tipos = [desde.tipo];
  let actual: NodoFalso | undefined = desde.conexiones[0];
  while (actual !== undefined) {
    tipos.push(actual.tipo);
    actual = actual.conexiones[0];
  }
  return tipos;
}

describe('MotorAudio.crear', () => {
  it('carga los dos módulos del worklet en orden', async () => {
    const { entorno } = await crearMotor();
    expect(entorno.contexto.modulosCargados).toEqual(['sintetizador.js', 'recortador.js']);
  });

  it('arma la cadena sintetizador → brillo → volumen → envolvente → limitador → recorte → salida', async () => {
    const { sintetizador } = await crearMotor();
    expect(cadena(sintetizador)).toEqual([
      `worklet:${NOMBRE_SINTETIZADOR}`,
      'filtro',
      'ganancia',
      'ganancia',
      'limitador',
      `worklet:${NOMBRE_RECORTADOR}`,
      'destino',
    ]);
  });

  it('manda el brillo también a la reverberación, que vuelve al volumen', async () => {
    const { nodosDeTipo } = await crearMotor();
    const filtro = nodosDeTipo('filtro')[0];
    const convolucion = nodosDeTipo('convolucion')[0];
    expect(filtro?.conexiones.map((n) => n.tipo)).toEqual(['ganancia', 'convolucion']);
    expect(cadena(convolucion as NodoFalso).slice(0, 3)).toEqual(['convolucion', 'ganancia', 'ganancia']);
  });

  it('empieza en el nivel de calibración, con volumen de −12 dB y en silencio', async () => {
    const { sintetizador, param, volumen, envolvente, humedo, filtro } = await crearMotor();
    expect(sintetizador.opciones.processorOptions).toEqual({
      semilla: 7,
      modoInicial: MODO.lidio,
      capasIniciales: 2,
    });
    expect(sintetizador.opciones.outputChannelCount).toEqual([2]);
    expect([param('tempo').value, param('modo').value, param('capas').value]).toEqual([66, MODO.lidio, 2]);
    expect(filtro.type).toBe('lowpass');
    expect(filtro.frequency.value).toBe(3500);
    expect(humedo?.gain.value).toBe(0.35);
    expect(volumen?.gain.value).toBeCloseTo(dbAGanancia(-12), 10);
    expect(envolvente?.gain.value).toBe(0);
  });

  it('configura el limitador con umbral −6 dBFS y relación 20:1', async () => {
    const { nodosDeTipo } = await crearMotor();
    const limitador = nodosDeTipo('limitador')[0] as unknown as Record<string, ParametroFalso>;
    expect(limitador.threshold?.value).toBe(LIMITADOR.umbralDb);
    expect(limitador.ratio?.value).toBe(20);
    expect(limitador.knee?.value).toBe(0);
  });

  it('entrega la telemetría al recortador', async () => {
    const bufer = crearBuferTelemetria();
    const { recortador } = await crearMotor(false, bufer);
    expect(recortador.opciones.processorOptions).toEqual({ telemetria: bufer });
  });
});

describe('MotorAudio en uso', () => {
  it('iniciar reanuda el contexto y sube la envolvente en 1,5 s', async () => {
    const { motor, entorno, envolvente } = await crearMotor();
    entorno.contexto.currentTime = 2;
    await motor.iniciar();
    expect(entorno.contexto.state).toBe('running');
    expect(motor.estado).toBe('sonando');
    expect(envolvente?.gain.ultimo('lineal')).toEqual({ tipo: 'lineal', valor: 1, tiempo: 3.5 });
  });

  it('programa una rampa de tempo de 20 s de Intermedio a Activación alta (ΔBPM = 10)', async () => {
    const { motor, entorno, param } = await crearMotor();
    entorno.contexto.currentTime = 10;
    const duracion = motor.aplicarNivel('alta');
    expect(duracion).toBe(20);
    expect(param('tempo').eventos.slice(-2)).toEqual([
      { tipo: 'set', valor: 66, tiempo: 10 },
      { tipo: 'lineal', valor: 76, tiempo: 30 },
    ]);
    expect(param('modo').ultimo('set')).toEqual({ tipo: 'set', valor: MODO.pentatonicaMayor, tiempo: 10 });
    expect(param('capas').ultimo('set')).toEqual({ tipo: 'set', valor: 3, tiempo: 10 });
    expect(motor.nivel).toBe('alta');
  });

  it('alarga la rampa de tempo según |ΔBPM| × 2 s: de 76 a 59 BPM dura 34 s', async () => {
    const { motor, entorno, param } = await crearMotor();
    param('tempo').value = 76; // como si la rampa anterior hubiera terminado
    entorno.contexto.currentTime = 100;
    expect(motor.aplicarNivel('meta')).toBe(34);
    expect(param('tempo').ultimo('lineal')).toEqual({ tipo: 'lineal', valor: 59, tiempo: 134 });
  });

  it('interpola brillo y reverberación en 45 s', async () => {
    const { motor, entorno, filtro, humedo } = await crearMotor();
    entorno.contexto.currentTime = 5;
    motor.aplicarNivel('meta');
    expect(filtro.frequency.ultimo('exponencial')).toEqual({
      tipo: 'exponencial',
      valor: 2000,
      tiempo: 5 + DURACION_RAMPA_TIMBRE_S,
    });
    expect(humedo?.gain.ultimo('lineal')).toEqual({ tipo: 'lineal', valor: 0.5, tiempo: 50 });
  });

  it('acota el volumen entre −40 y 0 dB', async () => {
    const { motor } = await crearMotor();
    expect(motor.fijarVolumenDb(-60)).toBe(-40);
    expect(motor.fijarVolumenDb(6)).toBe(0);
    expect(motor.fijarVolumenDb(-20)).toBe(-20);
    expect(motor.volumenDb).toBeCloseTo(-20, 6);
  });

  it('detener baja a cero en 50 ms y después pausa el contexto', async () => {
    const { motor, entorno, envolvente } = await crearMotor();
    await motor.iniciar();
    entorno.contexto.currentTime = 30;
    await motor.detener();
    expect(envolvente?.gain.ultimo('lineal')).toEqual({ tipo: 'lineal', valor: 0, tiempo: 30 + RAMPA_DETENCION_S });
    expect(entorno.esperas).toEqual([60]);
    expect(entorno.contexto.state).toBe('suspended');
    expect(motor.estado).toBe('detenido');
  });

  it('detener no hace nada si no está sonando', async () => {
    const { motor, entorno } = await crearMotor();
    await motor.detener();
    expect(entorno.esperas).toEqual([]);
  });

  it('programa y cancela el fundido final en el reloj de audio', async () => {
    const { motor, entorno, envolvente } = await crearMotor();
    await motor.iniciar();
    if (envolvente === undefined) {
      throw new Error('Falta la envolvente');
    }
    envolvente.gain.value = 1;
    entorno.contexto.currentTime = 600;

    const eventosAntes = envolvente.gain.eventos.length;
    const fin = motor.programarFundidoFinal(120);
    expect(fin).toBe(600 + 120 + FUNDIDO_FINAL_S);
    // No cancela nada de lo ya programado (el fundido de entrada puede seguir en curso).
    expect(envolvente.gain.eventos.slice(eventosAntes)).toEqual([
      { tipo: 'set', valor: 1, tiempo: 720 },
      { tipo: 'lineal', valor: 0, tiempo: 740 },
    ]);

    entorno.contexto.currentTime = 650;
    motor.cancelarFundidoFinal();
    expect(envolvente.gain.ultimo('cancelar')?.tiempo).toBe(650);
    expect(envolvente.gain.ultimo('lineal')).toEqual({ tipo: 'lineal', valor: 1, tiempo: 652 });
  });

  it('lee playbackStats cuando existe y marca si mide la salida real', async () => {
    const { motor, entorno } = await crearMotor();
    expect(motor.estadisticas()).toBeNull();
    entorno.contexto.playbackStats = { underrunEvents: 2, underrunDuration: 0.01, totalDuration: 60 };
    expect(motor.estadisticas()).toEqual({
      subdesbordamientos: 2,
      duracionSubdesbordamientosS: 0.01,
      duracionTotalS: 60,
      midiendoSalidaReal: true,
    });
  });

  it('lee el pico de salida desde la telemetría, en dBFS', async () => {
    const bufer = crearBuferTelemetria();
    const { motor } = await crearMotor(false, bufer);
    const escritor = new EscritorTelemetria(bufer);
    escritor.escribir(0.5);
    escritor.escribir(0.25);
    const lectura = motor.leerPico();
    expect(lectura?.bloques).toBe(2);
    expect(lectura?.picoDbfs).toBeCloseTo(-6.02, 2);
    expect(motor.leerPico()).toEqual({ bloques: 0, picoDbfs: null });
  });

  it('sin telemetría no hay lectura de pico', async () => {
    const { motor } = await crearMotor();
    expect(motor.leerPico()).toBeNull();
  });

  it('cerrar cierra el contexto', async () => {
    const { motor, entorno } = await crearMotor();
    await motor.cerrar();
    expect(entorno.contexto.state).toBe('closed');
    expect(motor.estado).toBe('cerrado');
  });
});

describe('respaldo de Media Session por un elemento <audio>', () => {
  it('envía la salida a un flujo que reproduce un <audio> y avisa que la métrica no es la real', async () => {
    const { motor, entorno, recortador } = await crearMotor(true);
    expect(recortador.conexiones.map((n) => n.tipo)).toEqual(['flujo']);
    expect(entorno.elemento.srcObject).toEqual({ id: 'flujo' });

    await motor.iniciar();
    expect(entorno.elemento.reproduciendo).toBe(true);
    entorno.contexto.playbackStats = { underrunEvents: 0, underrunDuration: 0, totalDuration: 5 };
    expect(motor.estadisticas()?.midiendoSalidaReal).toBe(false);
    expect(motor.salidaPorElementoAudio).toBe(true);

    await motor.detener();
    expect(entorno.elemento.reproduciendo).toBe(false);
  });
});
