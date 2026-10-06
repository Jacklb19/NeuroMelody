import { expect, it } from 'vitest';
import { SynthesisCore, FADE_DURATION_S } from './SynthesisCore';
import { MODE } from './theory';

it('renders one thousand mode transitions without completing any tonal fade before twenty seconds', () => {
  const fs = 100;
  const core = new SynthesisCore(fs, 1, MODE.lydian);
  core.setInitialLayers(2);
  const sample = new Float32Array(1);
  const firstTwenty = new Float32Array(20 * fs);
  const lastTen = new Float32Array(10 * fs + 1);
  for (let transition = 0; transition < 1000; transition++) {
    const mode = transition % 2 === 0 ? MODE.dronePentatonic : MODE.lydian;
    for (let n = 0; n <= 16 * fs && core.currentMode !== mode; n++) core.process(sample, 60, mode, 2);
    expect(core.currentMode).toBe(mode);
    core.process(firstTwenty, 60, mode, 2);
    expect(core.bankGain(core.activeBank)).toBeLessThan(1);
    expect(core.bankGain(1 - core.activeBank)).toBeGreaterThan(0);
    core.process(lastTen, 60, mode, 2);
    expect(core.bankGain(core.activeBank)).toBeCloseTo(1, 8);
    expect(core.bankGain(1 - core.activeBank)).toBeCloseTo(0, 8);
  }
}, 90_000);

it('restarts interrupted mode and layer fades from their current gains for a full thirty seconds', () => {
  // The production sample clock at a low offline rate makes exact gain checkpoints cheap.
  const fs = 1000;
  const core = new SynthesisCore(fs, 1, MODE.lydian);
  core.setInitialLayers(2);
  const block = new Float32Array(fs);
  for (let second = 0; second < 15; second++) core.process(block, 60, MODE.dronePentatonic, 3);
  const bankBefore = core.bankGain(core.activeBank);
  const fadingBank = core.activeBank;
  const layerBefore = core.layerGain(2);
  expect(bankBefore).toBeGreaterThan(0);
  expect(bankBefore).toBeLessThan(1);
  const sample = new Float32Array(1);
  core.process(sample, 60, MODE.lydian, 2);
  expect(Math.abs(core.layerGain(2) - layerBefore)).toBeLessThan(0.001);
  for (let n = 0; n < 2 * fs && core.currentMode !== MODE.lydian; n++) {
    const gain = core.bankGain(fadingBank);
    core.process(sample, 60, MODE.lydian, 2);
    expect(Math.abs(core.bankGain(fadingBank) - gain)).toBeLessThan(0.001);
  }
  expect(core.currentMode).toBe(MODE.lydian);
  const startBank = core.bankGain(fadingBank);
  expect(startBank).toBeGreaterThanOrEqual(bankBefore);
  for (let second = 0; second < 20; second++) core.process(block, 60, MODE.lydian, 2);
  expect(core.bankGain(fadingBank)).toBeGreaterThan(0);
  expect(core.layerGain(2)).toBeGreaterThan(0);
  for (let second = 20; second <= FADE_DURATION_S; second++) core.process(block, 60, MODE.lydian, 2);
  expect(core.bankGain(fadingBank)).toBeCloseTo(0, 8);
  expect(core.layerGain(2)).toBeCloseTo(0, 8);
});
