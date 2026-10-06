import { describe, it, expect, vi } from 'vitest';
import { SourceChannel, SignalSourceError } from './sourceChannel';
import type { BeatNotification } from './contract';

function notification(timeMs: number, heartRate = 70): BeatNotification {
  return { timeMs, heartRate, rrIntervalsMs: [857], sensorContact: null };
}

describe('SourceChannel', () => {
  it('starts disconnected and reports each state change once', () => {
    const channel = new SourceChannel();
    const onStateChange = vi.fn();
    channel.subscribe({ onStateChange });

    expect(channel.state).toBe('disconnected');
    channel.changeState('connecting');
    channel.changeState('connecting');
    channel.changeState('connected');

    expect(onStateChange.mock.calls).toEqual([['connecting'], ['connected']]);
  });

  it('delivers valid notifications to every observer', () => {
    const channel = new SourceChannel();
    const a = vi.fn();
    const b = vi.fn();
    channel.subscribe({ onNotification: a });
    channel.subscribe({ onNotification: b });

    channel.notify(notification(1000));

    expect(a).toHaveBeenCalledWith(notification(1000));
    expect(b).toHaveBeenCalledWith(notification(1000));
  });

  it('discards an invalid notification and emits an error', () => {
    const channel = new SourceChannel();
    const onNotification = vi.fn();
    const onError = vi.fn();
    channel.subscribe({ onNotification, onError });

    channel.notify(notification(1000, 300));

    expect(onNotification).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(SignalSourceError);
  });

  it('rejects times that go backwards until time is reset', () => {
    const channel = new SourceChannel();
    const onNotification = vi.fn();
    const onError = vi.fn();
    channel.subscribe({ onNotification, onError });

    channel.notify(notification(5000));
    channel.notify(notification(1000));
    expect(onError).toHaveBeenCalledOnce();

    channel.resetTime();
    channel.notify(notification(1000));
    expect(onNotification).toHaveBeenCalledTimes(2);
  });

  it('stops notifying an unsubscribed observer', () => {
    const channel = new SourceChannel();
    const onNotification = vi.fn();
    const unsubscribe = channel.subscribe({ onNotification });

    unsubscribe();
    channel.notify(notification(1000));

    expect(onNotification).not.toHaveBeenCalled();
  });
});
