import { msFromRrUnits } from '../rrUnits';

/** Contenido útil de una notificación de la característica Heart Rate Measurement. */
export interface HeartRateMeasurement {
  /** Frecuencia cardíaca en latidos por minuto, sin validar el rango. */
  readonly heartRate: number;
  /** Contacto del sensor; `null` si el dispositivo no lo soporta. */
  readonly sensorContact: boolean | null;
  /** Intervalos RR en milisegundos (resolución de 1/1024 s). */
  readonly rrIntervalsMs: readonly number[];
}

/** La notificación no cumple el formato de la especificación. */
export class HeartRateMeasurementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorMedicionFC';
  }
}

// Bits del byte de banderas (Heart Rate Service, característica 0x2A37).
const FLAG_HR_16_BIT = 0x01;
const FLAG_CONTACT_DETECTED = 0x02;
const FLAG_CONTACT_SUPPORTED = 0x04;
const FLAG_ENERGY_PRESENT = 0x08;
const FLAG_RR_PRESENT = 0x10;

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
export function parseHeartRateMeasurement(data: DataView): HeartRateMeasurement {
  if (data.byteLength < 1) {
    throw new HeartRateMeasurementError('Medición vacía.');
  }
  const flags = data.getUint8(0);
  let offset = 1;

  const hr16Bit = (flags & FLAG_HR_16_BIT) !== 0;
  const hrBytes = hr16Bit ? 2 : 1;
  requireBytes(data, offset, hrBytes, 'frecuencia cardíaca');
  const heartRate = hr16Bit
    ? data.getUint16(offset, true)
    : data.getUint8(offset);
  offset += hrBytes;

  if ((flags & FLAG_ENERGY_PRESENT) !== 0) {
    requireBytes(data, offset, 2, 'energía gastada');
    offset += 2;
  }

  const rrIntervalsMs: number[] = [];
  if ((flags & FLAG_RR_PRESENT) !== 0) {
    if ((data.byteLength - offset) % 2 !== 0) {
      throw new HeartRateMeasurementError('Intervalos RR truncados.');
    }
    for (; offset < data.byteLength; offset += 2) {
      rrIntervalsMs.push(msFromRrUnits(data.getUint16(offset, true)));
    }
  }

  return {
    heartRate,
    sensorContact: parseContact(flags),
    rrIntervalsMs,
  };
}

function parseContact(flags: number): boolean | null {
  if ((flags & FLAG_CONTACT_SUPPORTED) === 0) {
    return null;
  }
  return (flags & FLAG_CONTACT_DETECTED) !== 0;
}

function requireBytes(
  data: DataView,
  offset: number,
  count: number,
  field: string,
): void {
  if (data.byteLength < offset + count) {
    throw new HeartRateMeasurementError(`Medición truncada: falta ${field}.`);
  }
}
