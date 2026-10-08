/** Source of random bytes; injectable for deterministic tests. */
export type RandomBytes = (length: number) => Uint8Array;

const browserRandomBytes: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

/**
 * Generates a UUID version 7 (RFC 9562): a 48-bit Unix timestamp in
 * milliseconds followed by random bits. Sessions get their id on the device
 * (ADR-18), so ids created offline sort by time and can be sent twice
 * without creating duplicates.
 */
export function uuidv7(nowMs: number = Date.now(), randomBytes: RandomBytes = browserRandomBytes): string {
  const bytes = randomBytes(16);
  let timestamp = Math.floor(nowMs);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Checks the textual shape of any UUID. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
