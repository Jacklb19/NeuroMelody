import { describe, expect, it } from 'vitest';
import { isSettled, SettleWatch, SETTLED_FOR_S } from './sleepSettle';

describe('isSettled', () => {
  const settled = { state: 'low', qualityGood: true, level: 'sleep' } as const;

  it('needs a lower pulse, a good signal and the calmest step of the program', () => {
    expect(isSettled(settled, 'sleep')).toBe(true);
    expect(isSettled({ ...settled, state: 'uncertain' }, 'sleep')).toBe(false);
    expect(isSettled({ ...settled, state: null }, 'sleep')).toBe(false);
    expect(isSettled({ ...settled, qualityGood: false }, 'sleep')).toBe(false);
    expect(isSettled({ ...settled, level: 'target' }, 'sleep')).toBe(false);
  });
});

describe('SettleWatch', () => {
  it('reports once the pulse has stayed settled for the whole time', () => {
    const watch = new SettleWatch();
    expect(watch.observe(100, true)).toBe(false);
    expect(watch.observe(100 + SETTLED_FOR_S - 1, true)).toBe(false);
    expect(watch.observe(100 + SETTLED_FOR_S, true)).toBe(true);
  });

  it('reports only once per session', () => {
    const watch = new SettleWatch(10);
    watch.observe(0, true);
    expect(watch.observe(10, true)).toBe(true);
    expect(watch.observe(20, true)).toBe(false);
    watch.reset();
    watch.observe(30, true);
    expect(watch.observe(40, true)).toBe(true);
  });

  it('starts the count again after a reading that is not settled', () => {
    const watch = new SettleWatch(10);
    watch.observe(0, true);
    expect(watch.observe(5, false)).toBe(false);
    expect(watch.observe(10, true)).toBe(false);
    expect(watch.observe(19, true)).toBe(false);
    expect(watch.observe(20, true)).toBe(true);
  });

  it('does not count the time before a pause', () => {
    const watch = new SettleWatch(10);
    watch.observe(0, true);
    watch.interrupt();
    expect(watch.observe(10, true)).toBe(false);
    expect(watch.observe(20, true)).toBe(true);
  });
});
