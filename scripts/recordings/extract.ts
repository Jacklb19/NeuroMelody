import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  RECORDING_DURATION_MIN,
  RECORDING_DURATION_MS,
  RECORDING_IDS,
  RECORDING_SCHEMA_VERSION,
  RECORDINGS_DIRECTORY,
  RECORDINGS_SAMPLE_RATE_HZ,
  RECORDINGS_SOURCE_URL,
  recordingFileName,
} from '../../src/features/acquisition/recording/recordingCatalog.ts';
import { extractSegment, readBeatSamples } from './wfdb.ts';

/** Gives up on a PhysioNet download that stalls. */
const DOWNLOAD_TIMEOUT_MS = 30_000;

const directory = fileURLToPath(new URL(`../../public/${RECORDINGS_DIRECTORY}/`, import.meta.url));

async function download(path: string): Promise<Response> {
  const response = await fetch(RECORDINGS_SOURCE_URL + path, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Download failed: ${path} (${String(response.status)})`);
  return response;
}

await mkdir(directory, { recursive: true });
const checksums = await (await download('SHA256SUMS.txt')).text();
for (const recordId of RECORDING_IDS) {
  const header = await (await download(`${recordId}.hea`)).text();
  const sampleRateHz = Number(header.trim().split(/\s+/)[2]);
  if (sampleRateHz !== RECORDINGS_SAMPLE_RATE_HZ) throw new Error(`Unexpected sample rate for ${recordId}`);
  const bytes = new Uint8Array(await (await download(`${recordId}.ecg`)).arrayBuffer());
  const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
  const checksum = checksums.split('\n').find(line => line.trim().endsWith(`${recordId}.ecg`))?.split(/\s+/)[0];
  if (checksum !== sourceSha256) throw new Error(`Checksum mismatch for ${recordId}`);
  const segment = extractSegment(readBeatSamples(bytes), sampleRateHz, RECORDING_DURATION_MS);
  const recording = { schemaVersion: RECORDING_SCHEMA_VERSION, recordId, sourceUrl: RECORDINGS_SOURCE_URL + `${recordId}.ecg`,
    sourceSha256, sampleRateHz, ...segment };
  await writeFile(`${directory}/${recordingFileName(recordId)}`, JSON.stringify(recording) + '\n');
  process.stdout.write(`${recordId}: ${String(segment.rrIntervalsMs.length)} RR intervals, ${String(RECORDING_DURATION_MIN)} minutes, SHA-256 verified\n`);
}
