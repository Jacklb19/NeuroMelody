/**
 * Signal sources the app knows (ADR-03, ADR-17). The id list is the single
 * source of truth: the `SourceKind` type, the source selector and stored
 * sessions are all derived from it.
 */
export const SOURCE_KIND_IDS = ['simulator', 'recording', 'ble'] as const;

export type SourceKind = (typeof SOURCE_KIND_IDS)[number];

/** Source selected when the session screen opens: it works in every browser. */
export const DEFAULT_SOURCE_KIND: SourceKind = 'simulator';
