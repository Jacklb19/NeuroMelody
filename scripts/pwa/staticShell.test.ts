import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config/app.ts';
import { fillShell, manifestSource, shellTokens, shellValues } from './staticShell.ts';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file: string): string => readFileSync(join(PROJECT_ROOT, file), 'utf8');

describe('static shell', () => {
  const tokens = shellTokens(read('src/index.css'));

  it('fills index.html from the app sources and leaves no value copied by hand', () => {
    const template = read('index.html');
    expect(template).not.toContain(APP_NAME);
    const shell = new DOMParser().parseFromString(fillShell(template, shellValues(tokens)), 'text/html');
    expect(shell.title).toBe(APP_NAME);
    expect(shell.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(tokens.theme);
  });

  it('rejects an unknown placeholder', () => {
    expect(() => fillShell('%MISSING%', {})).toThrow('%MISSING%');
  });

  it('builds the manifest with the brand colours', () => {
    expect(JSON.parse(manifestSource(tokens))).toMatchObject({ name: APP_NAME, theme_color: tokens.theme, background_color: tokens.background });
  });
});
