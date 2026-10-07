/**
 * Names shared by the app and the build script that writes the offline
 * worker (scripts/pwa). This module has no imports so Node can load it
 * without the bundler.
 */

/** Offline worker written by the build at the site root. */
export const SERVICE_WORKER_FILE = 'sw.js';

/** Prefix of the precache names; caches of older builds with this prefix are deleted on activation. */
export const CACHE_NAME_PREFIX = 'neuromelody-shell-';

/** Document served for navigations without network. */
export const APP_SHELL_PATH = '/index.html';

/**
 * Same-origin paths never cached: API responses may carry personal data.
 * The API lives on its own origin (ADR-19); the prefix guards against a proxy.
 */
export const UNCACHED_PATH_PREFIX = '/api/';
