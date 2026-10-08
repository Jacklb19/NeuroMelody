import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { MIN_LEVEL_DURATION_S } from '../adaptation/rules';
import { AudioEngine } from '../audio/engine/AudioEngine';
import { createFakeAudioEnvironment } from '../../test/fakeAudio';
import { calibrateToUncertain } from '../../test/adaptationReadings';
import { SECONDS_PER_MINUTE } from '../../shared/time';
import { SessionStage } from './SessionStage';

const { narrative, stage } = es.session;

describe('SessionStage', () => {
  it('asks for a signal while no source is connected', () => {
    render(<SessionStage session={new AdaptationSession()} connection="disconnected" playing={false} />);
    expect(screen.getByRole('heading', { name: narrative.noSource.title })).toBeVisible();
    expect(screen.getByText(narrative.noSource.detail)).toBeVisible();
    expect(screen.queryByText(stage.waitingForQuality)).not.toBeInTheDocument();
  });

  it('announces the estimated state with its uncalibrated confidence', () => {
    const session = new AdaptationSession();
    render(<SessionStage session={session} connection="connected" playing />);
    expect(screen.getByRole('status')).toHaveTextContent(es.adaptation.states.calibrating);
    expect(screen.getByText(stage.confidence)).toBeVisible();

    act(() => { calibrateToUncertain(session); });
    expect(screen.getByRole('status')).toHaveTextContent(es.adaptation.states.uncertain);
    expect(screen.getByRole('heading', { name: narrative.uncertain.title })).toBeVisible();

    act(() => { session.invalidate(); });
    expect(screen.getByText(stage.waitingForQuality)).toBeVisible();
  });

  it('explains the dwell while playing and drops the notice once the step is eligible', async () => {
    const env = createFakeAudioEnvironment();
    const audio = await AudioEngine.create(env.factory, { seed: 1, initialLevel: 'intermediate', outputThroughAudioElement: false });
    await audio.start();
    const session = new AdaptationSession();
    session.setAudio(audio);
    render(<SessionStage session={session} connection="connected" playing />);

    act(() => { calibrateToUncertain(session); });
    expect(screen.getByTestId('dwell-notice'))
      .toHaveTextContent(stage.dwell(MIN_LEVEL_DURATION_S / SECONDS_PER_MINUTE));

    act(() => { env.context.currentTime = MIN_LEVEL_DURATION_S + 0.5; session.pulse(); });
    expect(screen.queryByTestId('dwell-notice')).not.toBeInTheDocument();
  });
});
