import { msDesdeUnidadesRR } from '../rrUnits';

/** Contenido útil de una notificación de la característica Heart Rate Measurement. */
export interface MedicionFC {
  /** Frecuencia cardíaca en latidos por minuto, sin validar el rango. */
  readonly frecuenciaCardiaca: number;
  /** Contacto del sensor; `null` si el dispositivo no lo soporta. */
  readonly contactoSensor: boolean | null;
  /** Intervalos RR en milisegundos (resolución de 1/1024 s). */
  readonly intervalosRRms: readonly number[];
}

/** La notificación no cumple el formato de la especificación. */
export class ErrorMedicionFC extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorMedicionFC';
  }
}

// Bits del byte de banderas (Heart Rate Service, característica 0x2A37).
const BANDERA_FC_16_BITS = 0x01;
const BANDERA_CONTACTO_DETECTADO = 0x02;
const BANDERA_CONTACTO_SOPORTADO = 0x04;
const BANDERA_ENERGIA_PRESENTE = 0x08;
const BANDERA_RR_PRESENTE = 0x10;

/**
 * Interpreta el valor de la característica Heart Rate Measurement (RF-03).
 *
 * Formato (little endian): banderas (uint8), FC (uint8 o uint16), energía
 * gastada opcional (uint16, se descarta) y cero o más intervalos RR (uint16
 * en unidades de 1/1024 s).
 *
 * El rango fisiológico no se valida aquí: lo hace la frontera común de la
 * capa de adquisición, igual que para cualquier otra fuente.
 *
 * @throws ErrorMedicionFC si los datos están truncados o mal formados.
 */
export function interpretarMedicionFC(datos: DataView): MedicionFC {
  if (datos.byteLength < 1) {
    throw new ErrorMedicionFC('Medición vacía.');
  }
  const banderas = datos.getUint8(0);
  let desplazamiento = 1;

  const fc16Bits = (banderas & BANDERA_FC_16_BITS) !== 0;
  const bytesFC = fc16Bits ? 2 : 1;
  exigirBytes(datos, desplazamiento, bytesFC, 'frecuencia cardíaca');
  const frecuenciaCardiaca = fc16Bits
    ? datos.getUint16(desplazamiento, true)
    : datos.getUint8(desplazamiento);
  desplazamiento += bytesFC;

  if ((banderas & BANDERA_ENERGIA_PRESENTE) !== 0) {
    exigirBytes(datos, desplazamiento, 2, 'energía gastada');
    desplazamiento += 2;
  }

  const intervalosRRms: number[] = [];
  if ((banderas & BANDERA_RR_PRESENTE) !== 0) {
    if ((datos.byteLength - desplazamiento) % 2 !== 0) {
      throw new ErrorMedicionFC('Intervalos RR truncados.');
    }
    for (; desplazamiento < datos.byteLength; desplazamiento += 2) {
      intervalosRRms.push(msDesdeUnidadesRR(datos.getUint16(desplazamiento, true)));
    }
  }

  return {
    frecuenciaCardiaca,
    contactoSensor: interpretarContacto(banderas),
    intervalosRRms,
  };
}

function interpretarContacto(banderas: number): boolean | null {
  if ((banderas & BANDERA_CONTACTO_SOPORTADO) === 0) {
    return null;
  }
  return (banderas & BANDERA_CONTACTO_DETECTADO) !== 0;
}

function exigirBytes(
  datos: DataView,
  desplazamiento: number,
  cantidad: number,
  campo: string,
): void {
  if (datos.byteLength < desplazamiento + cantidad) {
    throw new ErrorMedicionFC(`Medición truncada: falta ${campo}.`);
  }
}
