import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { SessionProgress } from './SessionProgress';

const copy = es.session.progress;
const levels = es.session.journey.levels;

describe('SessionProgress', () => {
  it('marks each change of step of the music and names the chapter it is in (ADR-67)', () => {
    const { container } = render(
      <SessionProgress elapsedS={600} plannedS={1200} chapters={[
        { atS: 0, level: 'intermediate' },
        { atS: 432, level: 'target' },
      ]} />,
    );
    expect(container.querySelectorAll('.staff-chapter')).toHaveLength(1);
    expect(screen.getByText(copy.chapter(levels.target, '07:12'))).toBeVisible();
    expect(screen.getByRole('list', { name: copy.chaptersLabel })).toHaveTextContent(copy.chapterMark(levels.target, '07:12'));
  });

  it('shows no chapter while the music has not changed its step', () => {
    const { container } = render(<SessionProgress elapsedS={60} plannedS={1200} chapters={[{ atS: 0, level: 'intermediate' }]} />);
    expect(container.querySelectorAll('.staff-chapter')).toHaveLength(0);
    expect(screen.queryByText(copy.chapter(levels.intermediate, '00:00'))).not.toBeInTheDocument();
  });
});
