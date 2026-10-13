/**
 * Renders the synthesizer to WAV files, one folder per label, so a change to
 * the music can be heard before and after without opening the app:
 *
 *   node scripts/audio/renderSamples.ts <label>
 *
 * The files follow the session graph of AudioEngine (low-pass, reverb, volume
 * and clipper) with the level values of the product; an ambience joins at the
 * volume, as in the engine. The limiter is not
 * rebuilt: the report says when a file would have reached its threshold.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRandom } from '../../src/features/acquisition/simulator/prng.ts';
import { Ambience } from '../../src/features/audio/core/ambience.ts';
import type { AmbienceId } from '../../src/features/audio/core/ambienceCatalog.ts';
import { dbToGain, gainToDb } from '../../src/features/audio/core/decibels.ts';
import { softClipBlock } from '../../src/features/audio/core/softClip.ts';
import { SynthesisCore } from '../../src/features/audio/core/SynthesisCore.ts';
import { BRIGHTNESS_FILTER_Q, LIMITER, SESSION_FADE_IN_S } from '../../src/features/audio/engine/AudioEngine.ts';
import { generateImpulseResponse } from '../../src/features/audio/engine/impulseResponse.ts';
import { LEVELS, type LevelId } from '../../src/features/audio/engine/levels.ts';
import { TIMBRE_RAMP_DURATION_S, tempoRampDurationS } from '../../src/features/audio/engine/ramps.ts';
import { convolve, convolverNormalization, encodeWav, lowPass, spectrum } from './dsp.ts';

/** Same rate and block size as the session context and its worklet. */
const SAMPLE_RATE = 48_000;
const BLOCK = 128;
/** Fixed seed: every label renders the same session, so only the code differs. */
const SAMPLE_SEED = 20261012;
/** Files are rendered with the volume control at its loudest position. */
const SAMPLE_VOLUME_DB = 0;
const FADE_OUT_S = 3;
const BAND_EDGES_HZ = [20, 150, 500, 2000, 6000, 20_000];

const OUTPUT_DIRECTORY = fileURLToPath(new URL('../../audio-samples/', import.meta.url));
const PAGE_NAME = 'escuchar.html';
const REPORT_NAME = 'metrics.json';
const WAV_EXTENSION = '.wav';

interface Scene {
  readonly file: string;
  readonly title: string;
  readonly start: LevelId;
  readonly durationS: number;
  /** A level change scheduled like AudioEngine.applyLevel does. */
  readonly change?: { readonly atS: number; readonly to: LevelId };
  /** Ambience under the music; music alone when omitted. */
  readonly ambience?: AmbienceId;
}

const SCENES: readonly Scene[] = [
  { file: '1-activacion-alta', title: 'Activación alta', start: 'high', durationS: 45 },
  { file: '2-intermedio', title: 'Intermedio (así empieza toda sesión)', start: 'intermediate', durationS: 45 },
  { file: '3-meta', title: 'Meta: activación baja', start: 'target', durationS: 45 },
  {
    file: '4-paso-de-intermedio-a-meta',
    title: 'Paso de Intermedio a Meta (el cambio empieza a los 15 s)',
    start: 'intermediate',
    durationS: 100,
    change: { atS: 15, to: 'target' },
  },
  { file: '5-meta-con-lluvia', title: 'Meta con lluvia de fondo', start: 'target', durationS: 45, ambience: 'rain' },
  { file: '6-meta-con-mar', title: 'Meta con mar de fondo', start: 'target', durationS: 45, ambience: 'sea' },
  { file: '7-meta-con-viento', title: 'Meta con viento de fondo', start: 'target', durationS: 45, ambience: 'wind' },
];

const PAGE_TEXT = {
  title: 'NeuroMelody · muestras de la música',
  intro:
    'Cada bloque es una versión del sintetizador. Escúchalas con audífonos y al mismo volumen: todos los archivos se generan igual, así que la diferencia es solo el cambio de código.',
};

interface Report {
  readonly file: string;
  readonly peakDbfs: number;
  readonly rmsDbfs: number;
  /** Level as the ear weighs it (A curve): the figure to compare loudness between labels. */
  readonly loudnessDba: number;
  readonly stereoCorrelation: number;
  readonly reachesLimiter: boolean;
  readonly coreSpeedTimesRealTime: number;
  readonly bands: readonly { readonly label: string; readonly share: number }[];
}

/** Linear interpolation from `from` to `to` over `durationS`, starting at `startS`. */
function ramp(from: number, to: number, startS: number, durationS: number, timeS: number): number {
  const progress = Math.min(1, Math.max(0, (timeS - startS) / durationS));
  return from + (to - from) * progress;
}

function renderScene(scene: Scene): { left: Float32Array; right: Float32Array; report: Report } {
  const start = LEVELS[scene.start];
  const end = scene.change === undefined ? start : LEVELS[scene.change.to];
  const changeS = scene.change?.atS ?? 0;
  const length = Math.floor((scene.durationS * SAMPLE_RATE) / BLOCK) * BLOCK;

  const core = new SynthesisCore(SAMPLE_RATE, SAMPLE_SEED, start.mode);
  core.setInitialLayers(start.layers);
  const dry = [new Float32Array(length), new Float32Array(length)] as const;
  const blockLeft = new Float32Array(BLOCK);
  const blockRight = new Float32Array(BLOCK);
  const tempoRampS = tempoRampDurationS(start.tempo, end.tempo);
  const startedAt = performance.now();
  for (let offset = 0; offset < length; offset += BLOCK) {
    const timeS = offset / SAMPLE_RATE;
    const changed = scene.change !== undefined && timeS >= changeS;
    core.process(
      blockLeft,
      blockRight,
      ramp(start.tempo, end.tempo, changeS, tempoRampS, timeS),
      changed ? end.mode : start.mode,
      changed ? end.layers : start.layers,
    );
    dry[0].set(blockLeft, offset);
    dry[1].set(blockRight, offset);
  }
  const coreSpeed = scene.durationS / ((performance.now() - startedAt) / 1000);

  const ambience = [new Float32Array(length), new Float32Array(length)] as const;
  if (scene.ambience !== undefined) {
    const source = new Ambience(SAMPLE_RATE, SAMPLE_SEED, scene.ambience);
    for (let offset = 0; offset < length; offset += BLOCK) {
      source.process(ambience[0].subarray(offset, offset + BLOCK), ambience[1].subarray(offset, offset + BLOCK));
    }
  }

  // Brightness follows an exponential ramp and the reverb mix a linear one (AudioEngine.applyLevel).
  const cutoffAt = (timeS: number): number =>
    start.brightnessHz *
    (end.brightnessHz / start.brightnessHz) ** ramp(0, 1, changeS, TIMBRE_RAMP_DURATION_S, timeS);
  const response = generateImpulseResponse(SAMPLE_RATE);
  const normalization = convolverNormalization(response, SAMPLE_RATE);
  const volume = dbToGain(SAMPLE_VOLUME_DB);
  const fadeOutStartS = scene.durationS - FADE_OUT_S;

  let peak = 0;
  let squares = 0;
  let cross = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  // A stereo response convolves each input channel with its own side (ConvolverNode).
  const [left, right] = response.map((channel, side) => {
    const filtered = lowPass(dry[side] ?? dry[0], SAMPLE_RATE, BRIGHTNESS_FILTER_Q, BLOCK, cutoffAt);
    const wet = convolve(filtered, channel);
    const output = new Float32Array(length);
    for (let n = 0; n < length; n++) {
      const timeS = n / SAMPLE_RATE;
      const mix = ramp(start.reverb, end.reverb, changeS, TIMBRE_RAMP_DURATION_S, timeS);
      const envelope = Math.min(1, timeS / SESSION_FADE_IN_S) * ramp(1, 0, fadeOutStartS, FADE_OUT_S, timeS);
      const music = (filtered[n] ?? 0) + (wet[n] ?? 0) * normalization * mix;
      output[n] = (music + ((ambience[side] ?? ambience[0])[n] ?? 0)) * volume * envelope;
    }
    return output;
  });
  if (left === undefined || right === undefined) throw new Error('The impulse response is not stereo.');
  for (let n = 0; n < length; n++) {
    const l = left[n] ?? 0;
    const r = right[n] ?? 0;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    squares += (l * l + r * r) / 2;
    cross += l * r;
    leftSquares += l * l;
    rightSquares += r * r;
  }
  const mid = Float32Array.from(left, (l, n) => (l + (right[n] ?? 0)) / 2);
  const { bands, aWeightedDb } = spectrum(mid, SAMPLE_RATE, BAND_EDGES_HZ);
  softClipBlock(left);
  softClipBlock(right);

  return {
    left,
    right,
    report: {
      file: scene.file,
      peakDbfs: gainToDb(peak),
      rmsDbfs: gainToDb(Math.sqrt(squares / length)),
      loudnessDba: aWeightedDb,
      stereoCorrelation: cross / Math.sqrt(leftSquares * rightSquares),
      reachesLimiter: gainToDb(peak) > LIMITER.thresholdDb,
      coreSpeedTimesRealTime: coreSpeed,
      bands,
    },
  };
}

/** Rewrites the listening page with every WAV file of every label folder found. */
async function writePage(): Promise<void> {
  const entries = await readdir(OUTPUT_DIRECTORY, { withFileTypes: true });
  const labels = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const sections: string[] = [];
  for (const label of labels) {
    const files = (await readdir(OUTPUT_DIRECTORY + label)).filter((name) => name.endsWith(WAV_EXTENSION)).sort();
    const players = files.map((name) => {
      const file = name.slice(0, -WAV_EXTENSION.length);
      const title = SCENES.find((scene) => scene.file === file)?.title ?? file;
      return `<figure><figcaption>${title}</figcaption><audio controls preload="none" src="${label}/${name}"></audio></figure>`;
    });
    sections.push(`<section><h2>${label}</h2>${players.join('')}</section>`);
  }
  const page = `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${PAGE_TEXT.title}</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 46rem; margin: 2rem auto; padding: 0 1rem; }
  section { margin-block: 2rem; padding-block-start: 1rem; border-block-start: 1px solid; }
  figure { margin: 1rem 0; }
  audio { display: block; inline-size: 100%; margin-block-start: 0.25rem; }
</style>
<h1>${PAGE_TEXT.title}</h1>
<p>${PAGE_TEXT.intro}</p>
${sections.join('\n')}
</html>
`;
  await writeFile(OUTPUT_DIRECTORY + PAGE_NAME, page, 'utf8');
}

const label = process.argv[2];
if (label === undefined || !/^[a-z0-9-]+$/.test(label)) {
  throw new Error('Usage: node scripts/audio/renderSamples.ts <label> (lowercase letters, digits and hyphens)');
}
const directory = `${OUTPUT_DIRECTORY}${label}/`;
await mkdir(directory, { recursive: true });
const dither = createRandom(SAMPLE_SEED);
const reports: Report[] = [];
for (const scene of SCENES) {
  const { left, right, report } = renderScene(scene);
  await writeFile(`${directory}${scene.file}${WAV_EXTENSION}`, encodeWav(left, right, SAMPLE_RATE, dither));
  reports.push(report);
  const bands = report.bands.map((band) => `${band.label} ${(band.share * 100).toFixed(2)}%`).join(' | ');
  console.log(
    `${scene.file}: peak ${report.peakDbfs.toFixed(1)} dBFS, rms ${report.rmsDbfs.toFixed(1)} dBFS, loudness ${report.loudnessDba.toFixed(1)} dBA, ` +
      `stereo correlation ${report.stereoCorrelation.toFixed(2)}, core ${report.coreSpeedTimesRealTime.toFixed(0)}x real time` +
      `${report.reachesLimiter ? ', REACHES THE LIMITER' : ''}\n  ${bands}`,
  );
}
await writeFile(directory + REPORT_NAME, JSON.stringify(reports, null, 2), 'utf8');
await writePage();
console.log(`Written to ${directory} and ${OUTPUT_DIRECTORY}${PAGE_NAME}`);
