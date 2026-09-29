import { useCallback, useEffect, useRef, useState } from 'react';
import { MotorAudio, type FabricaAudio, type OpcionesMotor } from '../engine/AudioEngine';

export type EstadoAudio = 'inactivo' | 'cargando' | 'sonando' | 'detenido' | 'error';

export interface ControlMotorAudio {
  /** Motor actual; `null` antes del primer inicio. */
  readonly motor: () => MotorAudio | null;
  readonly estado: EstadoAudio;
  readonly error: string | null;
  readonly iniciar: (opciones: OpcionesMotor, volumenDb: number) => Promise<MotorAudio | null>;
  readonly detener: () => Promise<void>;
  /** Cierra el motor para crear uno nuevo en el próximo inicio (por ejemplo, con otra salida). */
  readonly descartar: () => Promise<void>;
}

async function fabricaPorOmision(): Promise<FabricaAudio> {
  // Se carga al primer inicio: separa el código de audio del paquete inicial.
  const modulo = await import('../engine/browserFactory');
  return modulo.fabricaDelNavegador;
}

/**
 * Ciclo de vida del motor de audio para un componente. El contexto se crea
 * en el primer inicio, que siempre ocurre tras una interacción del usuario.
 */
export function useMotorAudio(fabrica?: FabricaAudio): ControlMotorAudio {
  const motorRef = useRef<MotorAudio | null>(null);
  const [estado, setEstado] = useState<EstadoAudio>('inactivo');
  const [error, setError] = useState<string | null>(null);

  const iniciar = useCallback(
    async (opciones: OpcionesMotor, volumenDb: number): Promise<MotorAudio | null> => {
      setEstado('cargando');
      setError(null);
      try {
        let motor = motorRef.current;
        if (motor === null || motor.estado === 'cerrado') {
          motor = await MotorAudio.crear(fabrica ?? (await fabricaPorOmision()), opciones);
          motorRef.current = motor;
        }
        motor.fijarVolumenDb(volumenDb);
        await motor.iniciar();
        setEstado('sonando');
        return motor;
      } catch (causa) {
        setEstado('error');
        setError(causa instanceof Error ? causa.message : String(causa));
        return null;
      }
    },
    [fabrica],
  );

  const detener = useCallback(async (): Promise<void> => {
    const motor = motorRef.current;
    if (motor?.estado !== 'sonando') {
      return;
    }
    // La rampa de 50 ms ya quedó programada: la interfaz refleja la detención de inmediato.
    const detencion = motor.detener();
    setEstado('detenido');
    await detencion;
  }, []);

  const descartar = useCallback(async (): Promise<void> => {
    const motor = motorRef.current;
    motorRef.current = null;
    setEstado('inactivo');
    await motor?.cerrar();
  }, []);

  useEffect(
    () => () => {
      void motorRef.current?.cerrar();
      motorRef.current = null;
    },
    [],
  );

  const motor = useCallback(() => motorRef.current, []);
  return { motor, estado, error, iniciar, detener, descartar };
}
