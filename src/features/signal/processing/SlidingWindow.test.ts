import { describe, it, expect } from 'vitest';
import type { ClassifiedBeat } from './types';
import { SlidingWindow } from './SlidingWindow';

function beat(endMs: number): ClassifiedBeat {
  return { endMs, rrMs: 1000, accepted: true, discardReason: null, contiguousWithPrevious: true };
}

describe('VentanaDeslizante', () => {
  it('conserva solo los latidos de los últimos 5 minutos de señal', () => {
    const slidingWindow = new SlidingWindow();
    for (let end = 1000; end <= 400_000; end += 1000) {
      slidingWindow.addBeat(beat(end));
    }
    slidingWindow.prune(400_000);

    expect(slidingWindow.beats[0]?.endMs).toBe(101_000);
    expect(slidingWindow.beats.at(-1)?.endMs).toBe(400_000);
    expect(slidingWindow.beats).toHaveLength(300);
  });

  it('descarta los tramos que terminaron fuera de la ventana y fusiona los contiguos', () => {
    const slidingWindow = new SlidingWindow();
    slidingWindow.addSegment({ startMs: 10_000, endMs: 20_000 });
    slidingWindow.addSegment({ startMs: 150_000, endMs: 155_000 });
    slidingWindow.addSegment({ startMs: 155_000, endMs: 160_000 });
    slidingWindow.prune(330_000);

    expect(slidingWindow.segments).toEqual([{ startMs: 150_000, endMs: 160_000 }]);
  });

  it('queda vacía si todo quedó fuera, y al vaciarla', () => {
    const slidingWindow = new SlidingWindow();
    slidingWindow.addBeat(beat(1000));
    slidingWindow.prune(1_000_000);
    expect(slidingWindow.beats).toEqual([]);

    slidingWindow.addBeat(beat(1_000_000));
    slidingWindow.addSegment({ startMs: 0, endMs: 1_000_000 });
    slidingWindow.clear();
    expect(slidingWindow.beats).toEqual([]);
    expect(slidingWindow.segments).toEqual([]);
  });
});
