import { msFromRrUnits } from '../rrUnits';

/** Useful content of a Heart Rate Measurement characteristic notification. */
export interface HeartRateMeasurement {
  /** Heart rate in beats per minute; the range is not validated here. */
  readonly heartRate: number;
  /** Sensor contact; `null` when the device does not support it. */
  readonly sensorContact: boolean | null;
  /** RR intervals in milliseconds (1/1024 s resolution). */
  readonly rrIntervalsMs: readonly number[];
}

/** How a notification breaks the format; the interface turns each code into text. */
export const MEASUREMENT_ERROR_CODES = [
  'empty',
  'truncated_heart_rate',
  'truncated_energy_expended',
  'truncated_rr',
] as const;

export type MeasurementErrorCode = (typeof MEASUREMENT_ERROR_CODES)[number];

/** The notification does not follow the specification format. */
export class HeartRateMeasurementError extends Error {
  readonly code: MeasurementErrorCode;

  constructor(code: MeasurementErrorCode) {
    super(`Malformed heart rate measurement: ${code}`);
    this.name = 'HeartRateMeasurementError';
    this.code = code;
  }
}

// Bits of the flags byte (Heart Rate Service, characteristic 0x2A37).
const FLAG_HR_16_BIT = 0x01;
const FLAG_CONTACT_DETECTED = 0x02;
const FLAG_CONTACT_SUPPORTED = 0x04;
const FLAG_ENERGY_PRESENT = 0x08;
const FLAG_RR_PRESENT = 0x10;

// Field sizes of the characteristic, in bytes.
const UINT8_BYTES = 1;
const UINT16_BYTES = 2;

/**
 * Parses the value of the Heart Rate Measurement characteristic (RF-03).
 *
 * Format (little endian): flags (uint8), heart rate (uint8 or uint16),
 * optional energy expended (uint16, discarded) and zero or more RR intervals
 * (uint16, in units of 1/1024 s).
 *
 * The physiological range is not validated here: the shared boundary of the
 * acquisition layer does it, as for any other source.
 *
 * @throws HeartRateMeasurementError if the data is truncated or malformed.
 */
export function parseHeartRateMeasurement(data: DataView): HeartRateMeasurement {
  if (data.byteLength < UINT8_BYTES) {
    throw new HeartRateMeasurementError('empty');
  }
  const flags = data.getUint8(0);
  let offset = UINT8_BYTES;

  const hr16Bit = (flags & FLAG_HR_16_BIT) !== 0;
  const hrBytes = hr16Bit ? UINT16_BYTES : UINT8_BYTES;
  requireBytes(data, offset, hrBytes, 'truncated_heart_rate');
  const heartRate = hr16Bit
    ? data.getUint16(offset, true)
    : data.getUint8(offset);
  offset += hrBytes;

  if ((flags & FLAG_ENERGY_PRESENT) !== 0) {
    requireBytes(data, offset, UINT16_BYTES, 'truncated_energy_expended');
    offset += UINT16_BYTES;
  }

  const rrIntervalsMs: number[] = [];
  if ((flags & FLAG_RR_PRESENT) !== 0) {
    if ((data.byteLength - offset) % UINT16_BYTES !== 0) {
      throw new HeartRateMeasurementError('truncated_rr');
    }
    for (; offset < data.byteLength; offset += UINT16_BYTES) {
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
  code: MeasurementErrorCode,
): void {
  if (data.byteLength < offset + count) {
    throw new HeartRateMeasurementError(code);
  }
}
