import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { APP_NAME } from '../../src/config/app.ts';
import { ROUTES } from '../../src/config/routes.ts';
import { app } from '../../src/i18n/es/app.ts';
import { DEFAULT_LOCALE } from '../../src/i18n/locale.ts';

/** Served path of the web manifest, linked from index.html. */
export const MANIFEST_FILE = 'manifest.webmanifest';

/** Design tokens the shell needs before any stylesheet loads. */
export interface ShellTokens {
  readonly background: string;
  readonly theme: string;
}

/** Reads one custom property from the stylesheet text; a missing token fails the build. */
export function cssToken(css: string, name: string): string {
  const match = new RegExp(String.raw`${name}:\s*([^;]+);`).exec(css);
  if (match?.[1] === undefined) throw new Error(`Design token ${name} is not defined in src/index.css.`);
  return match[1].trim();
}

export function shellTokens(css: string): ShellTokens {
  return { background: cssToken(css, '--color-background'), theme: cssToken(css, '--color-background') };
}

/** Values index.html receives through its %NAME% placeholders. */
export function shellValues(tokens: ShellTokens): Readonly<Record<string, string>> {
  return {
    APP_NAME,
    LANG: DEFAULT_LOCALE,
    THEME_COLOR: tokens.theme,
    DESCRIPTION: app.shellDescription(APP_NAME),
  };
}

/** Replaces every %NAME% placeholder; an unknown one fails, so nothing ships half filled. */
export function fillShell(html: string, values: Readonly<Record<string, string>>): string {
  return html.replace(/%([A-Z_]+)%/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`index.html uses the unknown placeholder %${name}%.`);
    return value;
  });
}

export function manifestSource(tokens: ShellTokens): string {
  return JSON.stringify({
    name: APP_NAME,
    short_name: APP_NAME,
    lang: DEFAULT_LOCALE,
    start_url: ROUTES.app,
    scope: ROUTES.home,
    display: 'standalone',
    background_color: tokens.background,
    theme_color: tokens.theme,
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, null, 2);
}

/**
 * Generates the static shell from the app's own sources (P-02, item 9):
 * index.html placeholders and the web manifest take the product name,
 * locale, description and brand colours, so none of them is copied by hand.
 */
export function staticShell(): Plugin {
  let tokens: ShellTokens | null = null;
  const read = (root: string): ShellTokens => {
    tokens ??= shellTokens(readFileSync(path.join(root, 'src', 'index.css'), 'utf8'));
    return tokens;
  };
  let root = '';
  return {
    name: 'neuromelody-static-shell',
    configResolved(config) { root = config.root; },
    transformIndexHtml(html) { return fillShell(html, shellValues(read(root))); },
    configureServer(server) {
      server.middlewares.use(`/${MANIFEST_FILE}`, (_request, response) => {
        response.setHeader('Content-Type', 'application/manifest+json');
        response.end(manifestSource(read(root)));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: MANIFEST_FILE, source: manifestSource(read(root)) });
    },
  };
}
