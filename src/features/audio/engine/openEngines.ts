/** What the registry needs from an engine: a way to silence and release it. */
export interface Closable {
  readonly close: () => Promise<void>;
}

/**
 * Every audio engine that is open on this page. A screen that fails while
 * rendering is torn down by its error boundary, and the boundary cannot reach
 * the engine that screen owned: this list lets it close them all, so music
 * never keeps playing without a stop control on screen.
 */
const open = new Set<Closable>();

export function trackOpenEngine(engine: Closable): void {
  open.add(engine);
}

export function untrackOpenEngine(engine: Closable): void {
  open.delete(engine);
}

/** Closes every open engine; a failure to close one does not keep the others playing. */
export async function closeOpenEngines(): Promise<void> {
  const engines = [...open];
  open.clear();
  await Promise.allSettled(engines.map((engine) => engine.close()));
}
