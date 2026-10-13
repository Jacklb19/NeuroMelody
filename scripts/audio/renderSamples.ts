/**
 * Entry point of the sample renderer. The app modules import each other
 * without file extensions (the bundler resolves them); Node does not, so a
 * resolve hook adds `.ts` before the renderer and the synthesizer are loaded.
 */
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});

await import('./render.ts');
