import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../config/app';
import { ROUTES } from '../config/routes';
import { DEFAULT_LOCALE } from '../i18n/locale';

/**
 * index.html and the web manifest are static files served before the app
 * runs, so they copy a few values instead of importing them. These checks
 * keep each copy equal to its source.
 */
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const readProjectFile = (file: string): string => readFileSync(join(PROJECT_ROOT, file), 'utf8');

function cssToken(name: string): string {
  const match = new RegExp(String.raw`${name}:\s*([^;]+);`).exec(readProjectFile('src/index.css'));
  if (match?.[1] === undefined) throw new Error(`Design token ${name} is not defined in src/index.css.`);
  return match[1].trim();
}

describe('static shell files', () => {
  it('index.html uses the locale, product name and brand colour of the app', () => {
    const shell = new DOMParser().parseFromString(readProjectFile('index.html'), 'text/html');
    expect(shell.documentElement.lang).toBe(DEFAULT_LOCALE);
    expect(shell.title).toBe(APP_NAME);
    expect(shell.querySelector('meta[name="theme-color"]')?.getAttribute('content'))
      .toBe(cssToken('--color-button-background'));
    expect(shell.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(new RegExp(`^${APP_NAME}:`));
  });

  it('the web manifest uses the locale, product name, home route and design tokens of the app', () => {
    const manifest: unknown = JSON.parse(readProjectFile('public/manifest.webmanifest'));
    expect(manifest).toMatchObject({
      name: APP_NAME,
      short_name: APP_NAME,
      lang: DEFAULT_LOCALE,
      start_url: ROUTES.home,
      scope: ROUTES.home,
      background_color: cssToken('--color-background'),
      theme_color: cssToken('--color-button-background'),
    });
  });
});
