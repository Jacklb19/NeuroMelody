import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { es } from '../../i18n/es';
import { createMelody, type Melody } from './melody';
import { MelodyList } from './MelodyList';

const copy = es.listen.melodies;

const melody = (name: string, positionS: number): Melody => createMelody({
  name, seed: 1, instrument: 'warm', ambience: 'sea', profile: 'original', level: 'target', positionS, musicMix: 1, ambienceMix: 1,
}, 'ana', new Date('2026-11-16T21:00:00Z'));

function renderList(melodies: readonly Melody[], overrides: Partial<Parameters<typeof MelodyList>[0]> = {}) {
  const handlers = { onPlay: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), onCreate: vi.fn() };
  render(<MelodyList melodies={melodies} cloud="synced" pending={new Set()} failed={false} playingId={null} paused={false}
    highlightedId={null} {...handlers} {...overrides} />);
  return handlers;
}

describe('MelodyList', () => {
  it('offers the saved minute and the start, or only the start when nothing much was heard', () => {
    const long = melody('Costa nocturna', 12 * 60 + 30);
    const short = melody('Lluvia', 20);
    const { onPlay } = renderList([long, short]);

    fireEvent.click(screen.getByRole('button', { name: copy.fromMinute(12) }));
    expect(onPlay).toHaveBeenLastCalledWith(long, true);
    fireEvent.click(screen.getByRole('button', { name: copy.fromStart }));
    expect(onPlay).toHaveBeenLastCalledWith(long, false);
    fireEvent.click(screen.getByRole('button', { name: copy.play }));
    expect(onPlay).toHaveBeenLastCalledWith(short, false);
  });

  it('shows the melody the player holds as playing or paused, with nothing to play it again', () => {
    const held = melody('Costa nocturna', 0);
    const { rerender } = render(<MelodyList melodies={[held]} cloud="synced" pending={new Set()} failed={false} playingId={held.id}
      paused={false} highlightedId={null} onPlay={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText(copy.playing)).toBeVisible();
    expect(screen.queryByRole('button', { name: copy.play })).not.toBeInTheDocument();
    rerender(<MelodyList melodies={[held]} cloud="synced" pending={new Set()} failed={false} playingId={held.id}
      paused highlightedId={null} onPlay={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText(es.listen.player.phases.paused)).toBeVisible();
  });

  it('renames in place, refusing an empty name, and deletes only after confirming', () => {
    const kept = melody('Costa nocturna', 0);
    const { onRename, onDelete } = renderList([kept]);

    fireEvent.click(screen.getByRole('button', { name: copy.rename }));
    const field = screen.getByLabelText(es.listen.save.nameLabel);
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: copy.renameSave }));
    expect(onRename).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '  Mi costa ' } });
    fireEvent.click(screen.getByRole('button', { name: copy.renameSave }));
    expect(onRename).toHaveBeenCalledWith(kept.id, 'Mi costa');

    fireEvent.click(screen.getByRole('button', { name: copy.delete }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: copy.deleteConfirm }));
    expect(onDelete).toHaveBeenCalledWith(kept.id);
  });

  it('says where the melodies stand and which ones wait to be uploaded', () => {
    const waiting = melody('Costa nocturna', 0);
    renderList([waiting], { cloud: 'offline', pending: new Set([waiting.id]) });
    expect(screen.getByRole('status')).toHaveTextContent(copy.cloud.offline);
    expect(screen.getByText(copy.pending)).toBeVisible();
  });

  it('invites to create one when there is none', () => {
    const { onCreate } = renderList([]);
    expect(screen.getByText(copy.empty)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: copy.create }));
    expect(onCreate).toHaveBeenCalledOnce();
  });
});
