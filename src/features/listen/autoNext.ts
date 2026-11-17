/** Playback preference belongs to the device, independent of any account or melody. */
export const AUTO_NEXT_STORAGE_KEY = 'neuromelody.auto-next';

export function readAutoNext(): boolean {
  try { return localStorage.getItem(AUTO_NEXT_STORAGE_KEY) !== 'false'; }
  catch { return true; }
}

export function rememberAutoNext(enabled: boolean): void {
  try { localStorage.setItem(AUTO_NEXT_STORAGE_KEY, String(enabled)); }
  catch { /* Playback remains usable when the device refuses storage. */ }
}
