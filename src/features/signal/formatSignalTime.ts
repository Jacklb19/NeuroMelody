import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '../../shared/time';

/**
 * Signal time as `m:ss` with unpadded minutes, e.g. "0:30" or "5:00". The
 * panel and the chart axis share it so the same instant reads the same in
 * both places.
 */
export function formatSignalTime(ms: number): string {
  const seconds = Math.floor(ms / MS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  return `${String(minutes)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`;
}
