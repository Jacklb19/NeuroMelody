import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractSegment, readBeatSamples } from './wfdb.ts';

const SOURCE = 'https://physionet.org/files/nsr2db/1.0.0/';
const directory = fileURLToPath(new URL('../../public/recordings/', import.meta.url));

async function download(path: string): Promise<Response> {
  const response = await fetch(SOURCE + path, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Download failed: ${path} (${String(response.status)})`);
  return response;
}

await mkdir(directory, { recursive: true });
const checksums = await (await download('SHA256SUMS.txt')).text();
for (const recordId of ['nsr001', 'nsr002']) {
  const header = await (await download(`${recordId}.hea`)).text();
  const sampleRateHz = Number(header.trim().split(/\s+/)[2]);
  if (sampleRateHz !== 128) throw new Error(`Unexpected sample rate for ${recordId}`);
  const bytes = new Uint8Array(await (await download(`${recordId}.ecg`)).arrayBuffer());
  const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
  const checksum = checksums.split('\n').find(line => line.trim().endsWith(`${recordId}.ecg`))?.split(/\s+/)[0];
  if (checksum !== sourceSha256) throw new Error(`Checksum mismatch for ${recordId}`);
  const segment = extractSegment(readBeatSamples(bytes), sampleRateHz, 30 * 60 * 1000);
  const recording = { schemaVersion: 1, recordId, sourceUrl: SOURCE + `${recordId}.ecg`,
    sourceSha256, sampleRateHz, ...segment };
  await writeFile(`${directory}/${recordId}.json`, JSON.stringify(recording) + '\n');
  process.stdout.write(`${recordId}: ${String(segment.rrIntervalsMs.length)} RR intervals, 30 minutes, SHA-256 verified\n`);
}
