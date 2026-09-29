import { useMemo, useSyncExternalStore } from 'react';
import type { EstadoConexion, FuenteSenal, NotificacionLatido } from '../acquisition/contract';

/** Lo que la interfaz necesita saber de una fuente de señal. */
export interface LecturaFuente {
  readonly estado: EstadoConexion;
  readonly ultima: NotificacionLatido | null;
  /** Intervalos RR recibidos desde la conexión. */
  readonly latidosRecibidos: number;
  readonly error: string | null;
}

interface AlmacenLecturas {
  readonly suscribir: (avisar: () => void) => () => void;
  readonly leer: () => LecturaFuente;
}

const LECTURA_SIN_FUENTE: LecturaFuente = {
  estado: 'desconectada',
  ultima: null,
  latidosRecibidos: 0,
  error: null,
};

const ALMACEN_SIN_FUENTE: AlmacenLecturas = {
  suscribir: () => () => undefined,
  leer: () => LECTURA_SIN_FUENTE,
};

/**
 * Adapta una fuente al modelo de almacén externo de React: cada evento crea
 * una lectura nueva e inmutable, y `leer` devuelve siempre la misma
 * referencia mientras no haya cambios.
 */
function crearAlmacenLecturas(fuente: FuenteSenal): AlmacenLecturas {
  let lectura: LecturaFuente = { ...LECTURA_SIN_FUENTE, estado: fuente.estado };

  return {
    suscribir: (avisar) => {
      // La fuente pudo cambiar de estado entre la creación del almacén y la
      // suscripción; React vuelve a leer tras suscribirse y lo detecta.
      if (lectura.estado !== fuente.estado) {
        lectura = { ...lectura, estado: fuente.estado };
      }
      return fuente.suscribir({
        alNotificar: (notificacion) => {
          lectura = {
            ...lectura,
            ultima: notificacion,
            latidosRecibidos: lectura.latidosRecibidos + notificacion.intervalosRRms.length,
          };
          avisar();
        },
        alCambiarEstado: (estado) => {
          lectura = { ...lectura, estado };
          avisar();
        },
        alError: (error) => {
          lectura = { ...lectura, error: error.message };
          avisar();
        },
      });
    },
    leer: () => lectura,
  };
}

/** Suscribe el componente a una fuente de señal (o a ninguna, con `null`). */
export function useFuenteSenal(fuente: FuenteSenal | null): LecturaFuente {
  const almacen = useMemo(
    () => (fuente === null ? ALMACEN_SIN_FUENTE : crearAlmacenLecturas(fuente)),
    [fuente],
  );
  return useSyncExternalStore(almacen.suscribir, almacen.leer);
}
