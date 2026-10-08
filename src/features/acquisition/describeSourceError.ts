import type { Messages } from '../../i18n/messages';
import { BleConnectionError, type BleFailure } from './ble/BleSource';
import { HeartRateMeasurementError, type MeasurementErrorCode } from './ble/parseHeartRateMeasurement';
import { CameraUnavailableError, type CameraFailure } from './camera/cameraCapture';
import { MAX_HR, MIN_HR } from './config';
import { RecordingError, type RecordingErrorCode } from './recording/recording';
import { SignalSourceError } from './sourceChannel';
import type { NotificationIssue } from './validateNotification';

type AcquisitionMessages = Messages['acquisition'];

/** Every notification issue with its text; the type rejects a code without one. */
function notificationIssueTexts(t: AcquisitionMessages): Readonly<Record<NotificationIssue, string>> {
  return {
    ...t.notificationIssues,
    heart_rate_out_of_range: t.notificationIssues.heart_rate_out_of_range(MIN_HR, MAX_HR),
  };
}

/**
 * Text that explains an error a signal source reported. Sources only emit
 * codes; this is where they become words, so the logic never carries copy.
 */
export function describeSourceError(error: Error, t: AcquisitionMessages): string {
  if (error instanceof SignalSourceError) return notificationIssueTexts(t)[error.code];
  if (error instanceof HeartRateMeasurementError) {
    const texts: Readonly<Record<MeasurementErrorCode, string>> = t.measurementErrors;
    return texts[error.code];
  }
  if (error instanceof BleConnectionError) {
    const texts: Readonly<Record<BleFailure, string>> = t.bleFailures;
    return texts[error.code];
  }
  if (error instanceof RecordingError) {
    const texts: Readonly<Record<RecordingErrorCode, string>> = t.recordingErrors;
    return texts[error.code];
  }
  if (error instanceof CameraUnavailableError) {
    const texts: Readonly<Record<CameraFailure, string>> = t.camera.errors;
    return texts[error.code];
  }
  // Errors raised by the platform (a failed download, for example) carry no code: their message is all there is.
  return error.message;
}
