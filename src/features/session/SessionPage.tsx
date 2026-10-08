import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import type { SignalSource } from '../acquisition/contract';
import { AcquisitionPanel } from '../acquisition/AcquisitionPanel';
import { useSignalSource } from '../acquisition/useSignalSource';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { readDuration } from '../plan/plan';
import { SignalPanel } from '../signal/SignalPanel';
import { AdaptationSession } from '../adaptation/AdaptationSession';
import { MusicalStatePanel } from '../adaptation/MusicalStatePanel';
import { PageHeading } from '../../shared/PageHeading';
import { SessionStage } from './SessionStage';
import { SessionProgress } from './SessionProgress';

/**
 * Listening session at /session (docs/pantallas.md). The simple view comes
 * first: what is happening, the music controls and the session progress.
 * Signal figures and musical parameters stay one click away (ADR-24).
 */
export function SessionPage(): React.JSX.Element {
  usePageTitle('Sesión');
  const [params] = useSearchParams();
  const durationMin = readDuration(params.get('duration'));
  // Acquisition creates the shared source; signal analysis consumes it.
  const [source, setSource] = useState<SignalSource | null>(null);
  const [adaptation] = useState(() => new AdaptationSession());
  const [elapsedS, setElapsedS] = useState(0);
  const connection = useSignalSource(source).state;

  return (
    <div className="session-page">
      <PageHeading eyebrow="Tu espacio de escucha" title="Sesión">
        <p>Plan: {durationMin} minutos.</p>
      </PageHeading>

      <div className="listening-stage">
        <SessionStage session={adaptation} connection={connection} />
        <PlaybackPanel durationMin={durationMin} onEngineChange={adaptation.setAudio} onElapsedChange={setElapsedS} />
        <SessionProgress elapsedS={elapsedS} plannedS={durationMin * 60} />
      </div>

      <AcquisitionPanel source={source} onSourceChange={setSource} />

      <details className="technical-details">
        <summary>
          <span className="summary-title">Detalles técnicos</span>
          <span className="summary-hint">Gráfica de la señal, índices y parámetros musicales</span>
        </summary>
        <div className="technical-layout">
          <SignalPanel source={source} onIndices={adaptation.receive} onReset={adaptation.reset} onUnavailable={adaptation.invalidate} onPulse={adaptation.pulse} />
          <MusicalStatePanel session={adaptation} />
        </div>
      </details>
    </div>
  );
}
