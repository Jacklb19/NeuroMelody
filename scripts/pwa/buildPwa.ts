import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { serviceWorkerSource } from './serviceWorker.ts';

/** Adds a versioned precache of the actual build, including lazy audio modules and workers. */
export function buildPwa(): Plugin {
  let outputDirectory = '';
  return {
    name: 'neuromelody-pwa',
    apply: 'build',
    configResolved(config) { outputDirectory = path.resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const entries = await readdir(outputDirectory, { recursive: true, withFileTypes: true });
      const assets = entries.filter(entry => entry.isFile() && entry.name !== 'sw.js')
        .map(entry => path.relative(outputDirectory, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .sort();
      const hash = createHash('sha256');
      for (const file of assets) {
        hash.update(file);
        hash.update(await readFile(path.join(outputDirectory, file)));
      }
      await writeFile(path.join(outputDirectory, 'sw.js'),
        serviceWorkerSource(assets.map(file => '/' + file), hash.digest('hex').slice(0, 16)));
    },
  };
}
