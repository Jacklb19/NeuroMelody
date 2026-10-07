import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { BLE_FAILURES, BleConnectionError } from './ble/BleSource';
import { HeartRateMeasurementError, MEASUREMENT_ERROR_CODES } from './ble/parseHeartRateMeasurement';
import { MAX_HR, MIN_HR } from './config';
import { describeSourceError } from './describeSourceError';
import { RECORDING_ERROR_CODES, RecordingError } from './recording/recording';
import { SignalSourceError } from './sourceChannel';
import { NOTIFICATION_ISSUES } from './validateNotification';

const text = es.acquisition;

describe('describeSourceError', () => {
  it.each([
    ...NOTIFICATION_ISSUES.map((code) => new SignalSourceError(code)),
    ...MEASUREMENT_ERROR_CODES.map((code) => new HeartRateMeasurementError(code)),
    ...BLE_FAILURES.map((code) => new BleConnectionError(code)),
    ...RECORDING_ERROR_CODES.map((code) => new RecordingError(code)),
  ])('has a message for $name $code', (error) => {
    const description = describeSourceError(error, text);
    expect(description.trim()).not.toBe('');
    // The developer message never reaches the person.
    expect(description).not.toBe(error.message);
  });

  it('words the heart rate range from the boundary limits', () => {
    expect(describeSourceError(new SignalSourceError('heart_rate_out_of_range'), text))
      .toBe(text.notificationIssues.heart_rate_out_of_range(MIN_HR, MAX_HR));
  });

  it('points to the button that connects a new strap', () => {
    expect(describeSourceError(new BleConnectionError('no_remembered_device'), text)).toContain(text.connect.ble);
  });

  it('keeps the message of an error without a code', () => {
    expect(describeSourceError(new TypeError('Failed to fetch'), text)).toBe('Failed to fetch');
  });
});
