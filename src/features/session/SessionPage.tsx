import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import type { SignalSource } from '../acquisition/contract';
import { AcquisitionPanel } from '../acquisition/AcquisitionPanel';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { readDuration } from '../plan/plan';
import { SignalPanel } from '../signal/SignalPanel';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { MusicalStatePanel } from '../adaptation/MusicalStatePanel';
import { PageHeading } from '../../shared/PageHeading';

/** Listening session at /session, as defined in docs/pantallas.md. */
export function SessionPage(): React.JSX.Element {
  usePageTitle('Sesión');
  const [params] = useSearchParams();
  const durationMin = readDuration(params.get('duration'));
  // Acquisition creates the shared source; signal analysis consumes it.
  const [source, setSource] = useState<SignalSource | null>(null);
  const [adaptation] = useState(() => new AdaptationSession());

  return (
    <div className="session-page">
      <PageHeading eyebrow="Tu espacio de escucha" title="Sesión">
        <p>Plan: {durationMin} minutos.</p>
      </PageHeading>
      <div className="listening-layout">
        <PlaybackPanel durationMin={durationMin} onEngineChange={adaptation.setAudio} />
        <MusicalStatePanel session={adaptation} />
      </div>
      <div className="signal-layout">
        <AcquisitionPanel source={source} onSourceChange={setSource} />
        <SignalPanel source={source} onIndices={adaptation.receive} onReset={adaptation.reset} onUnavailable={adaptation.invalidate} onPulse={adaptation.pulse} />
      </div>
    </div>
  );
}
