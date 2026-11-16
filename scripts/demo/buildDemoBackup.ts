import { writeFile } from 'node:fs/promises';
import { buildDemoBackup } from './demoLibrary.ts';

/**
 * Writes the demonstration library of one account as a backup file the app
 * restores from the profile (Perfil → Copia de seguridad → Restaurar).
 *
 *   node scripts/demo/buildDemoBackup.ts <account id> [output file]
 *
 * The account id is the UUID Supabase shows in Authentication → Users. The
 * backup only restores into that account: the app refuses it in any other.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const [owner, output = 'neuromelody-demo-backup.json'] = process.argv.slice(2);

if (owner === undefined || !UUID.test(owner)) {
  console.error('Usage: node scripts/demo/buildDemoBackup.ts <account id (UUID)> [output file]');
  process.exit(1);
}

const backup = buildDemoBackup({ owner, now: new Date() });
await writeFile(output, JSON.stringify(backup));
console.log(`Wrote ${String(backup.sessions.length)} sessions, ${String(backup.favorites.length)} favorites and ${String(backup.melodies.length)} melodies to ${output}`);
