import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { useSessionStore } from '../records/sessionStoreContext';
import type { SessionRecord } from '../records/sessionRecord';
import { PageHeading } from '../../shared/PageHeading';
import { SessionSummaryView } from './SessionSummaryView';

type Loaded =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly record: SessionRecord };

/** Summary of one session at /summary/:id (RF-15, HU-08), read from the device. */
export function SessionSummaryPage(): React.JSX.Element {
  usePageTitle('Resumen de la sesión');
  const { id = '' } = useParams();
  const store = useSessionStore();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  useEffect(() => {
    let current = true;
    store.get(id).then(
      (record) => { if (current) setLoaded(record === null ? { kind: 'missing' } : { kind: 'ready', record }); },
      (error: unknown) => {
        if (current) setLoaded({ kind: 'error', message: error instanceof Error ? error.message : 'Error desconocido.' });
      },
    );
    return () => { current = false; };
  }, [id, store]);

  if (loaded.kind === 'ready') {
    return (
      <SessionSummaryView
        record={loaded.record}
        onRecordChange={(record) => { setLoaded({ kind: 'ready', record }); }}
      />
    );
  }
  return (
    <div className="reading-page">
      <PageHeading eyebrow="Resumen de la sesión" title={loaded.kind === 'loading' ? 'Cargando…' : 'Sesión no encontrada'}>
        {loaded.kind === 'missing' && <p>Esta sesión no está guardada en este dispositivo. Puede que se haya borrado.</p>}
        {loaded.kind === 'error' && <p role="alert">No se pudo leer el historial ({loaded.message}).</p>}
      </PageHeading>
      {loaded.kind !== 'loading' && <Link to="/history" className="button button-secondary">Ir al historial</Link>}
    </div>
  );
}
