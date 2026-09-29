import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import type { SignalSource } from '../acquisition/contract';
import { AcquisitionPanel } from '../acquisition/AcquisitionPanel';
import { PlaybackPanel } from '../audio/ui/PlaybackPanel';
import { readDuration } from '../plan/plan';
import { SignalPanel } from '../signal/SignalPanel';

/** Sesión en curso (docs/pantallas.md, `/session`). */
export function SessionPage(): React.JSX.Element {
  usePageTitle('Sesión');
  const [params] = useSearchParams();
  const durationMin = readDuration(params.get('duration'));
  // La fuente se comparte: la adquisición la crea y el análisis la consume.
  const [source, setSource] = useState<SignalSource | null>(null);

  return (
    <>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Sesión</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
        Plan: {durationMin} minutos.
      </p>
      <PlaybackPanel durationMin={durationMin} />
      <AcquisitionPanel source={source} onSourceChange={setSource} />
      <SignalPanel source={source} />
    </>
  );
}
